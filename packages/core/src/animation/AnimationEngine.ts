import * as THREE from "three"
import { VRMHumanBoneName, type VRM } from "@pixiv/three-vrm"
import type { LoadedModel } from "../loader/AssetLoader.js"
import type { Expression, Gesture } from "../types/index.js"

// ── Math helpers ──────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

// ── VRM Procedural Gesture Definitions ───────────────────────────────────────

type GestureFn = (t: number, vrm: VRM) => void

const VRM_GESTURES: Record<Gesture, { duration: number; fn: GestureFn }> = {
  wave: {
    duration: 3.0,
    fn(t, vrm) {
      const h         = vrm.humanoid
      const rArm      = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const rForearm  = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
      const rHand     = h.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
      const lArm      = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      // raise (0–0.25) → wave (0.25–0.80) → lower (0.80–1.0)
      const raiseW = smoothstep(clamp01(t / 0.25))
      const lowerW = t > 0.80 ? smoothstep((t - 0.80) / 0.20) : 0
      const poseW  = raiseW * (1 - lowerW)

      // Upper arm: ~30° above horizontal — hand ends up near ear/face level
      if (rArm) {
        rArm.rotation.z = lerp(Math.PI / 5, -Math.PI / 6, poseW)
        rArm.rotation.x = 0
        rArm.rotation.y = 0
      }
      // Shared wave phase so forearm and hand move in sync
      const wavePhase = t >= 0.25 && t <= 0.80
        ? Math.sin((t - 0.25) / 0.55 * Math.PI * 4)
        : 0

      // Elbow bent ~70°, supinate palm forward — forearm sways gently with the wave
      if (rForearm) {
        rForearm.rotation.z = lerp(0, -1.35 + wavePhase * 0.12, poseW)
        rForearm.rotation.y = lerp(0,  Math.PI / 2, poseW)
        rForearm.rotation.x = 0
      }
      // Hand rocks side-to-side in sync with forearm sway
      if (rHand) {
        rHand.rotation.y = wavePhase * 0.4 * poseW
        rHand.rotation.x = 0
        rHand.rotation.z = 0
      }

      if (lArm) lArm.rotation.z = -Math.PI / 5
    },
  },

  nod: {
    duration: 1.8,
    fn(t, vrm) {
      const h    = vrm.humanoid
      const neck = h.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const rArm = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      const fade = t > 0.85 ? (1 - t) / 0.15 : 1
      if (neck) neck.rotation.x = 0.32 * Math.max(0, Math.sin(t * Math.PI * 2)) * fade

      if (rArm) rArm.rotation.z =  Math.PI / 5
      if (lArm) lArm.rotation.z = -Math.PI / 5
    },
  },

  shakeHead: {
    duration: 1.8,
    fn(t, vrm) {
      const h    = vrm.humanoid
      const neck = h.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const rArm = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      const fade = t > 0.85 ? (1 - t) / 0.15 : 1
      if (neck) neck.rotation.y = 0.35 * Math.sin(t * Math.PI * 2.5) * fade

      if (rArm) rArm.rotation.z =  Math.PI / 5
      if (lArm) lArm.rotation.z = -Math.PI / 5
    },
  },

  point: {
    duration: 2.0,
    fn(t, vrm) {
      const h        = vrm.humanoid
      const rArm     = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const rForearm = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
      const lArm     = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      let w: number
      if      (t < 0.20)  w = smoothstep(t / 0.20)
      else if (t < 0.75)  w = 1
      else                w = smoothstep(1 - (t - 0.75) / 0.25)

      if (rArm) {
        rArm.rotation.z = lerp(Math.PI / 5, -Math.PI / 6, w)
        rArm.rotation.x = lerp(0, -0.25, w)
      }
      if (rForearm) rForearm.rotation.x = lerp(0, -0.15, w)
      if (lArm)     lArm.rotation.z     = -Math.PI / 5
    },
  },

  clap: {
    duration: 2.0,
    fn(t, vrm) {
      const h        = vrm.humanoid
      const rArm     = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm     = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
      const rForearm = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
      const lForearm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm)

      const enter = smoothstep(clamp01(t / 0.15))
      const exit  = t > 0.85 ? smoothstep((t - 0.85) / 0.15) : 0
      const w     = enter * (1 - exit)

      if (rArm) { rArm.rotation.z = lerp(Math.PI / 5, Math.PI / 12, w); rArm.rotation.x = lerp(0, -0.2, w) }
      if (lArm) { lArm.rotation.z = lerp(-Math.PI / 5, -Math.PI / 12, w); lArm.rotation.x = lerp(0, -0.2, w) }

      if (t >= 0.15 && t <= 0.85) {
        const clp = Math.max(0, Math.sin((t - 0.15) / 0.7 * Math.PI * 3)) * 0.35 * w
        if (rForearm) rForearm.rotation.y = -clp
        if (lForearm) lForearm.rotation.y =  clp
      } else {
        if (rForearm) rForearm.rotation.y = 0
        if (lForearm) lForearm.rotation.y = 0
      }
    },
  },

  jump: {
    duration: 1.2,
    fn(t, vrm) {
      const h     = vrm.humanoid
      const spine = h.getNormalizedBoneNode(VRMHumanBoneName.Spine)
      const chest = h.getNormalizedBoneNode(VRMHumanBoneName.Chest)
      const rArm  = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm  = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      const bounce   = Math.abs(Math.sin(t * Math.PI * 1.5)) * Math.exp(-t * 3)
      if (spine) spine.rotation.x = lerp(0, -0.1, bounce * 2)
      if (chest) chest.rotation.x = lerp(0.015 * Math.sin(t * 1.8), -0.08, bounce * 2)

      const armLift = Math.max(0, Math.sin(t * Math.PI)) * 0.4
      if (rArm) rArm.rotation.z =  Math.PI / 5 - armLift
      if (lArm) lArm.rotation.z = -Math.PI / 5 + armLift
    },
  },

  dance: {
    duration: 3.0,
    fn(t, vrm) {
      const h     = vrm.humanoid
      const spine = h.getNormalizedBoneNode(VRMHumanBoneName.Spine)
      const chest = h.getNormalizedBoneNode(VRMHumanBoneName.Chest)
      const neck  = h.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const rArm  = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm  = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      const fade = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1
      const sway = Math.sin(t * Math.PI * 4) * fade

      if (spine) spine.rotation.z = sway * 0.12
      if (chest) chest.rotation.z = -sway * 0.08
      if (neck)  neck.rotation.z  = Math.sin(t * Math.PI * 4 + Math.PI / 4) * 0.08 * fade

      if (rArm) { rArm.rotation.z = Math.PI / 5 - sway * 0.5; rArm.rotation.x = Math.abs(sway) * 0.1 }
      if (lArm) { lArm.rotation.z = -Math.PI / 5 + sway * 0.5; lArm.rotation.x = Math.abs(sway) * 0.1 }
    },
  },
}

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
  private _vrmIdleTime = 0

  private _gestureActive = false
  private _gestureElapsed = 0
  private _gestureDuration = 0
  private _gestureUpdateFn: ((t: number) => void) | null = null

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
      this._initVRMRestPose()
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
    this._vrmIdleTime += delta

    if (this._gestureActive) {
      this._tickProceduralGesture(delta)
    } else {
      this._updateVRMProceduralIdle(this._vrmIdleTime)
    }

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

  // Cycle order: aa appears most (open vowel dominates natural speech)
  private static readonly _VRM_VISEME_CYCLE = ["aa", "aa", "oh", "aa", "ih", "aa", "ee", "ou"] as const
  private static readonly _VRM_VISEMES      = ["aa", "ih", "ou", "ee", "oh"] as const

  setMouthMorph(value: number): void {
    const clamped = Math.max(0, Math.min(1, value))

    if (this.vrm?.expressionManager) {
      const em = this.vrm.expressionManager
      // Reset all mouth visemes
      for (const v of AnimationEngine._VRM_VISEMES) em.setValue(v, 0)

      if (clamped > 0.01) {
        // Pick viseme based on syllable clock (~4 Hz = 250ms per step)
        const phase = Math.floor(performance.now() / 250) % AnimationEngine._VRM_VISEME_CYCLE.length
        const viseme = AnimationEngine._VRM_VISEME_CYCLE[phase] ?? "aa"
        em.setValue(viseme, clamped)
      }
      return
    }

    this._setMorphTarget(MOUTH_MORPHS, clamped)
  }

  // ── Gestures ──────────────────────────────────────────────────────────────────

  playGesture(gesture: Gesture): void {
    if (this.vrm) {
      this._playVRMProceduralGesture(gesture)
      return
    }

    // GLB fallback: try embedded clip
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

  private _playVRMProceduralGesture(gesture: Gesture): void {
    const def = VRM_GESTURES[gesture]
    if (!def || !this.vrm) return
    const vrm = this.vrm
    this._gestureActive   = true
    this._gestureElapsed  = 0
    this._gestureDuration = def.duration
    this._gestureUpdateFn = (t) => def.fn(t, vrm)
  }

  private _tickProceduralGesture(delta: number): void {
    if (!this._gestureUpdateFn) return
    this._gestureElapsed += delta
    const t = Math.min(this._gestureElapsed / this._gestureDuration, 1)
    this._gestureUpdateFn(t)
    if (t >= 1) {
      this._gestureActive   = false
      this._gestureUpdateFn = null
      this._gestureElapsed  = 0
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

  private _initVRMRestPose(): void {
    if (!this.vrm) return
    const h = this.vrm.humanoid
    const rArm = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
    const lArm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
    if (rArm) rArm.rotation.z =  Math.PI / 5
    if (lArm) lArm.rotation.z = -Math.PI / 5
  }

  private _updateVRMProceduralIdle(t: number): void {
    if (!this.vrm) return
    const h = this.vrm.humanoid
    // A-pose arms — must be set every frame before vrm.update() processes them
    const rArm = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
    const lArm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
    if (rArm) rArm.rotation.z =  Math.PI / 5
    if (lArm) lArm.rotation.z = -Math.PI / 5
    // Breathing + sway
    const chest = h.getNormalizedBoneNode(VRMHumanBoneName.Chest)
    if (chest) chest.rotation.x = 0.015 * Math.sin(t * 1.8)
    const spine = h.getNormalizedBoneNode(VRMHumanBoneName.Spine)
    if (spine) spine.rotation.z = 0.008 * Math.sin(t * 0.7)
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
    this._gestureActive   = false
    this._gestureUpdateFn = null
    this._gestureElapsed  = 0
  }
}
