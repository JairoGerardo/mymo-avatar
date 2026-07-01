import * as THREE from "three"
import { VRMHumanBoneName, type VRM } from "@pixiv/three-vrm"
import type { LoadedModel } from "../loader/AssetLoader.js"
import type { Expression, Gesture } from "../types/index.js"

const EXPRESSION_MORPHS: Record<Expression, string[]> = {
  idle: [],
  smile: ["Smile", "smile", "Happy", "happy", "mouthSmile", "Joy"],
  sad: ["Sad", "sad", "Frown", "frown", "mouthFrown"],
  happy: ["Smile", "smile", "Happy", "happy", "Joy", "joy"],
  angry: ["Angry", "angry", "Frown", "frown", "Mad"],
  surprised: ["Surprised", "surprised", "Awe", "awe", "Oh", "Shock"],
  thinking: ["Thinking", "thinking", "Sad", "Awe"],
  confused: ["Confused", "confused", "Awe", "Surprised"],
  sleep: ["Sleep", "sleep", "Blink", "eyesClosed"],
}

// Maps our expressions to VRM preset names
const VRM_EXPRESSION_MAP: Record<Expression, string | null> = {
  idle:      null,
  smile:     "happy",
  happy:     "happy",
  sad:       "sad",
  angry:     "angry",
  surprised: "surprised",
  thinking:  "relaxed",
  confused:  "surprised",
  sleep:     "blink",
}

const BLINK_MORPHS = ["Blink", "blink", "EyesClosed", "eyesClosed", "eyeBlink_L", "eyeBlink"]

const MOUTH_MORPHS = [
  "mouthOpen", "MouthOpen", "jawOpen", "JawOpen", "jaw_open",
  "mouth_open", "viseme_O", "viseme_aa", "A", "open",
]

const HEAD_BONE_NAMES_EXACT = [
  "Head", "head", "mixamorigHead", "Bip01_Head", "Bip001 Head",
  "head_joint", "HeadBone",
]
const HEAD_BONE_PATTERNS = [/^bip_head/i, /^head$/i, /head_0/i]

export class AnimationEngine {
  private mixer: THREE.AnimationMixer | null = null
  private clips: THREE.AnimationClip[] = []
  private currentAction: THREE.AnimationAction | null = null
  private idleAction: THREE.AnimationAction | null = null
  private vrm: VRM | null = null

  private morphMeshes: Array<THREE.Mesh | THREE.SkinnedMesh> = []
  private headBone: THREE.Bone | null = null
  private headBoneRestWorldQ = new THREE.Quaternion()
  private lookCurrentDelta = new THREE.Quaternion()
  private lookTargetDelta = new THREE.Quaternion()
  private lookSettled = true
  private _tmpParentWorldQInv = new THREE.Quaternion()
  private _tmpDesiredWorldQ = new THREE.Quaternion()

  private blinkTimer: ReturnType<typeof setInterval> | null = null
  private idleTimer: ReturnType<typeof setInterval> | null = null
  private randomLookTimeout: ReturnType<typeof setTimeout> | null = null

  init(model: LoadedModel): void {
    this.dispose()

    this.vrm = model.vrm ?? null
    this.mixer = new THREE.AnimationMixer(model.scene)
    this.clips = model.animations
    this.morphMeshes = []
    this.headBone = null

    if (this.vrm) {
      // VRM: use normalized humanoid head bone
      const headNode = this.vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)
      if (headNode) {
        this.headBone = headNode as THREE.Bone
        model.scene.updateWorldMatrix(true, true)
        this.headBone.getWorldQuaternion(this.headBoneRestWorldQ)
      }
    } else {
      // GLB: traverse for head bone and morph meshes
      model.scene.traverse((obj) => {
        if (obj instanceof THREE.Bone && !this.headBone) {
          const isExact = HEAD_BONE_NAMES_EXACT.includes(obj.name)
          const isPattern = !isExact && HEAD_BONE_PATTERNS.some((p) => p.test(obj.name))
          if (isExact || isPattern) {
            this.headBone = obj
            model.scene.updateWorldMatrix(true, true)
            obj.getWorldQuaternion(this.headBoneRestWorldQ)
          }
        }

        if (
          (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) &&
          obj.morphTargetDictionary &&
          Object.keys(obj.morphTargetDictionary).length > 0
        ) {
          this.morphMeshes.push(obj)
        }
      })
    }
  }

  update(delta: number): void {
    this.mixer?.update(delta)
    this.vrm?.update(delta)

    if (this.headBone) {
      if (!this.lookSettled) {
        const t = 1 - Math.pow(0.0001, delta)
        this.lookCurrentDelta.slerp(this.lookTargetDelta, t)
        if (this.lookCurrentDelta.angleTo(this.lookTargetDelta) < 0.01) {
          this.lookCurrentDelta.copy(this.lookTargetDelta)
          this.lookSettled = true
        }
      }

      this._tmpDesiredWorldQ.multiplyQuaternions(this.headBoneRestWorldQ, this.lookCurrentDelta)

      const parent = this.headBone.parent
      if (parent) {
        parent.getWorldQuaternion(this._tmpParentWorldQInv)
        this._tmpParentWorldQInv.invert()
        this.headBone.quaternion.multiplyQuaternions(this._tmpParentWorldQInv, this._tmpDesiredWorldQ)
      } else {
        this.headBone.quaternion.copy(this._tmpDesiredWorldQ)
      }
    }
  }

  // ── Animation clips ───────────────────────────────────────────────────────────

  play(name: string): void {
    const clip = THREE.AnimationClip.findByName(this.clips, name)
    if (!clip || !this.mixer) return
    this._transitionTo(this.mixer.clipAction(clip))
  }

  stop(): void {
    if (!this.currentAction) return
    this.currentAction.fadeOut(0.3)
    this.currentAction = null
    if (this.idleAction) this.idleAction.fadeIn(0.3).play()
  }

  private _transitionTo(action: THREE.AnimationAction, fadeMs = 0.3): void {
    if (this.currentAction === action) return
    this.currentAction?.fadeOut(fadeMs)
    action.reset().fadeIn(fadeMs).play()
    this.currentAction = action
  }

  // ── Idle ──────────────────────────────────────────────────────────────────────

  startIdle(intervalMs = 8000): void {
    const clip = this._findClip(/idle|breathing|float/i) ?? this.clips[0]
    if (clip && this.mixer) {
      this.idleAction = this.mixer.clipAction(clip)
      this.idleAction.setLoop(THREE.LoopRepeat, Infinity)
      this.idleAction.play()
    }

    this.idleTimer = setInterval(() => {
      this._randomIdleExpression()
    }, intervalMs)
  }

  stopIdle(): void {
    this.idleAction?.stop()
    this.idleAction = null
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = null
    }
  }

  private _randomIdleExpression(): void {
    const candidates: Expression[] = ["idle", "smile", "thinking"]
    const pick = candidates[Math.floor(Math.random() * candidates.length)] as Expression
    if (pick !== "idle") {
      this.setExpression(pick, 0.3)
      setTimeout(() => this.setExpression("idle", 0), 1200)
    }
  }

  // ── Blink ─────────────────────────────────────────────────────────────────────

  startBlink(intervalMs = 3500): void {
    this.blinkTimer = setInterval(() => {
      void this._doBlink()
    }, intervalMs + Math.random() * 1000 - 500)
  }

  stopBlink(): void {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer)
      this.blinkTimer = null
    }
  }

  private async _doBlink(): Promise<void> {
    if (this.vrm?.expressionManager) {
      this.vrm.expressionManager.setValue("blink", 1)
      await this._delay(120)
      this.vrm.expressionManager.setValue("blink", 0)
    } else {
      this._setMorphTarget(BLINK_MORPHS, 1)
      await this._delay(120)
      this._setMorphTarget(BLINK_MORPHS, 0)
    }
  }

  // ── Expressions ───────────────────────────────────────────────────────────────

  setExpression(expression: Expression, intensity = 1): void {
    if (this.vrm?.expressionManager) {
      const em = this.vrm.expressionManager
      // Reset all expression presets
      for (const name of Object.values(VRM_EXPRESSION_MAP)) {
        if (name) em.setValue(name, 0)
      }
      const vrmName = VRM_EXPRESSION_MAP[expression]
      if (vrmName) em.setValue(vrmName, intensity)
      return
    }

    // GLB morph target fallback
    if (expression === "idle") {
      for (const morphNames of Object.values(EXPRESSION_MORPHS)) {
        this._setMorphTarget(morphNames, 0)
      }
      return
    }

    const morphNames = EXPRESSION_MORPHS[expression]
    if (!morphNames.length) return

    for (const [key, names] of Object.entries(EXPRESSION_MORPHS)) {
      if (key !== expression && key !== "idle") this._setMorphTarget(names, 0)
    }
    this._setMorphTarget(morphNames, intensity)
  }

  // ── Mouth / Lip Sync ──────────────────────────────────────────────────────────

  setMouthMorph(value: number): void {
    const clamped = Math.max(0, Math.min(1, value))

    if (this.vrm?.expressionManager) {
      this.vrm.expressionManager.setValue("aa", clamped)
      return
    }

    this._setMorphTarget(MOUTH_MORPHS, clamped)
  }

  // ── Gestures ──────────────────────────────────────────────────────────────────

  playGesture(gesture: Gesture): void {
    const clip = this._findClip(new RegExp(gesture, "i"))
    if (clip && this.mixer) {
      const action = this.mixer.clipAction(clip)
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      this._transitionTo(action)

      this.mixer.addEventListener("finished", (e) => {
        if ((e as { action: THREE.AnimationAction }).action === action) {
          this.stop()
          this.mixer?.removeEventListener("finished", () => {})
        }
      })
    }
  }

  // ── Look ──────────────────────────────────────────────────────────────────────

  lookAt(dx: number, dy: number): void {
    const euler = new THREE.Euler(dy * 0.6, dx * 0.75, 0, "YXZ")
    this.lookTargetDelta.setFromEuler(euler)
    this.lookSettled = false
  }

  lookForward(): void {
    this.stopRandomLook()
    this.lookTargetDelta.identity()
    this.lookSettled = false
  }

  startRandomLook(): void {
    this.stopRandomLook()
    const pick = () => {
      const dx = (Math.random() - 0.5) * 1.4
      const dy = (Math.random() - 0.5) * 0.8
      this.lookAt(dx, dy)
      this.randomLookTimeout = setTimeout(pick, 1500 + Math.random() * 2000)
    }
    pick()
  }

  stopRandomLook(): void {
    if (this.randomLookTimeout) {
      clearTimeout(this.randomLookTimeout)
      this.randomLookTimeout = null
    }
  }

  stopLook(): void {
    this.stopRandomLook()
    this.lookTargetDelta.identity()
    this.lookCurrentDelta.identity()
  }

  hasHeadBone(): boolean {
    return this.headBone !== null
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private _setMorphTarget(candidates: string[], value: number): void {
    for (const mesh of this.morphMeshes) {
      const dict = mesh.morphTargetDictionary
      if (!dict || !mesh.morphTargetInfluences) continue
      for (const name of candidates) {
        const idx = dict[name]
        if (idx !== undefined) {
          mesh.morphTargetInfluences[idx] = value
          break
        }
      }
    }
  }

  private _findClip(pattern: RegExp): THREE.AnimationClip | undefined {
    return this.clips.find((c) => pattern.test(c.name))
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }

  dispose(): void {
    this.stopBlink()
    this.stopIdle()
    this.stopRandomLook()
    this.stopLook()
    this.mixer?.stopAllAction()
    this.mixer = null
    this.vrm = null
    this.clips = []
    this.morphMeshes = []
    this.headBone = null
    this.lookCurrentDelta.identity()
    this.lookTargetDelta.identity()
    this.lookSettled = true
    this.currentAction = null
    this.idleAction = null
  }
}
