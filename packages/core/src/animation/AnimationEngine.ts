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

// ── Rest pose constants (must match _updateVRMProceduralIdle) ────────────────

const REST_ARM_Z    =  Math.PI / 3.2   // upper arm z — arms close to body
const REST_FORE_R   = -0.10            // right forearm slight droop
const REST_FORE_L   =  0.10            // left forearm slight droop
const REST_HAND_X   = -0.15            // wrists slightly flexed up

// ── VRM Procedural Gesture Definitions ───────────────────────────────────────

type GestureFn = (t: number, vrm: VRM) => void

const VRM_GESTURES: Record<Gesture, { duration: number; fn: GestureFn }> = {
  wave: {
    duration: 3.0,
    fn(t, vrm) {
      const h         = vrm.humanoid
      const rShoulder = h.getNormalizedBoneNode(VRMHumanBoneName.RightShoulder)
      const rArm      = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const rForearm  = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
      const rHand     = h.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
      const lArm      = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      // raise (0–0.25) → wave (0.25–0.80) → lower (0.80–1.0)
      const raiseW = smoothstep(clamp01(t / 0.25))
      const lowerW = t > 0.80 ? smoothstep((t - 0.80) / 0.20) : 0
      const poseW  = raiseW * (1 - lowerW)

      // Shoulder: lift slightly so arm raises naturally from the joint
      if (rShoulder) {
        rShoulder.rotation.z = lerp(0, -0.20, poseW)
        rShoulder.rotation.x = 0
        rShoulder.rotation.y = 0
      }

      // Upper arm: Z=0 = T-pose = exactly horizontal (arm points straight to the side)
      if (rArm) {
        rArm.rotation.z = lerp(REST_ARM_Z, 0, poseW)
        rArm.rotation.x = 0
        rArm.rotation.y = 0
      }

      // Forearm: Z=-PI/2 rotates forearm upward when upper arm is horizontal
      if (rForearm) {
        rForearm.rotation.order = 'XYZ'
        rForearm.rotation.z = lerp(REST_FORE_R, -Math.PI / 2, poseW)
        rForearm.rotation.x = 0
        rForearm.rotation.y = 0
      }

      // Hand: palm faces outward (slight Z tilt) + wave side-to-side via Y
      const wavePhase = t >= 0.25 && t <= 0.80
        ? Math.sin((t - 0.25) / 0.55 * Math.PI * 4)
        : 0

      if (rHand) {
        rHand.rotation.x = lerp(REST_HAND_X, -Math.PI / 2, poseW)
        rHand.rotation.y = wavePhase * 0.40 * poseW
        rHand.rotation.z = 0
      }

      if (lArm) lArm.rotation.z = -REST_ARM_Z
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

      if (rArm) rArm.rotation.z =  REST_ARM_Z
      if (lArm) lArm.rotation.z = -REST_ARM_Z
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

      if (rArm) rArm.rotation.z =  REST_ARM_Z
      if (lArm) lArm.rotation.z = -REST_ARM_Z
    },
  },

  clap: {
    duration: 2.2,
    fn(t, vrm) {
      const h        = vrm.humanoid
      const rArm     = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm     = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
      const rForearm = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
      const lForearm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm)

      const enter = smoothstep(clamp01(t / 0.20))
      const exit  = t > 0.80 ? smoothstep((t - 0.80) / 0.20) : 0
      const w     = enter * (1 - exit)

      // 3 clap impacts: arms rest at openAngle, surge to clapAngle on each beat
      const clapOsc = t >= 0.20 && t <= 0.80
        ? Math.max(0, Math.sin((t - 0.20) / 0.60 * Math.PI * 10))
        : 0
      const openAngle = Math.PI / 2 - 0.08   // ~68° — hands slightly apart between beats
      const clapAngle = Math.PI / 2 + 0.05   // ~96° — hands meet at center
      const targetY   = lerp(openAngle, clapAngle, clapOsc)

      if (rArm) { rArm.rotation.z = lerp(REST_ARM_Z, Math.PI/3, w); rArm.rotation.y = lerp(0,  targetY, w); rArm.rotation.x = 0 }
      if (lArm) { lArm.rotation.z = lerp(-REST_ARM_Z, -Math.PI/3, w); lArm.rotation.y = lerp(0, -targetY, w); lArm.rotation.x = 0 }

      // Forearms: 72° bend (less vertical), palms facing forward
      const rHand = h.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
      const lHand = h.getNormalizedBoneNode(VRMHumanBoneName.LeftHand)

      if (rForearm) { rForearm.rotation.z = lerp(REST_FORE_R, -Math.PI / 2.5, w); rForearm.rotation.y = lerp(0,  Math.PI / 2, w); rForearm.rotation.x = 0 }
      if (lForearm) { lForearm.rotation.z = lerp(REST_FORE_L,  Math.PI / 2.5, w); lForearm.rotation.y = lerp(0, -Math.PI / 2, w); lForearm.rotation.x = 0 }

      if (rHand) { rHand.rotation.z = lerp(0, -Math.PI / 11.25, w); rHand.rotation.y = 0; rHand.rotation.x = lerp(REST_HAND_X, 0, w) }
      if (lHand) { lHand.rotation.z = lerp(0,  Math.PI / 11.25, w); lHand.rotation.y = 0; lHand.rotation.x = lerp(REST_HAND_X, 0, w) }
    },
  },

  jump: {
    duration: 1.5,
    fn(t, vrm) {
      const h      = vrm.humanoid
      const hips   = h.getNormalizedBoneNode(VRMHumanBoneName.Hips)
      const spine  = h.getNormalizedBoneNode(VRMHumanBoneName.Spine)
      const chest  = h.getNormalizedBoneNode(VRMHumanBoneName.Chest)
      const rArm   = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm   = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
      const rThigh = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperLeg)
      const lThigh = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperLeg)
      const rShin  = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerLeg)
      const lShin  = h.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerLeg)
      const rFoot  = h.getNormalizedBoneNode(VRMHumanBoneName.RightFoot)
      const lFoot  = h.getNormalizedBoneNode(VRMHumanBoneName.LeftFoot)

      // 0.00–0.22 crouch, 0.22–0.55 air up, 0.55–0.72 land, 0.72–1.00 recover
      let hipY = 0, kneeW = 0, footW = 0, armLift = 0, spineX = 0

      if (t < 0.22) {
        const p = smoothstep(t / 0.22)
        hipY   = -0.12 * p
        kneeW  = p
        footW  = -p * 0.85         // counter-rotate to keep feet flat on ground
        spineX = p * 0.06
      } else if (t < 0.55) {
        const p = smoothstep((t - 0.22) / 0.33)
        hipY    = lerp(-0.12, 0.22, p)
        kneeW   = lerp(1, 0, p)
        footW   = lerp(-0.85, 0.6, p) // feet go from flat → tiptoe in air
        armLift = p * 0.50
        spineX  = lerp(0.06, -0.05, p)
      } else if (t < 0.72) {
        const p = smoothstep((t - 0.55) / 0.17)
        hipY    = lerp(0.22, -0.07, p)
        kneeW   = p * 0.75
        footW   = lerp(0.6, -0.6, p)  // feet flatten on landing impact
        armLift = lerp(0.50, 0, p)
        spineX  = lerp(-0.05, 0.07, p)
      } else {
        const p = smoothstep((t - 0.72) / 0.28)
        hipY   = lerp(-0.07, 0, p)
        kneeW  = lerp(0.75, 0, p)
        footW  = lerp(-0.6, 0, p)     // return to neutral
        spineX = lerp(0.07, 0, p)
      }

      const hipsRestY = (vrm.scene.userData["hipsRestY"] as number) ?? 0
      if (hips)   hips.position.y = hipsRestY + hipY
      if (rThigh) { rThigh.rotation.x = -kneeW * 0.35; rThigh.rotation.z = 0; rThigh.rotation.y = 0 }
      if (lThigh) { lThigh.rotation.x = -kneeW * 0.35; lThigh.rotation.z = 0; lThigh.rotation.y = 0 }
      if (rShin)  { rShin.rotation.x  =  kneeW * 1.2;  rShin.rotation.z  = 0; rShin.rotation.y  = 0 }
      if (lShin)  { lShin.rotation.x  =  kneeW * 1.2;  lShin.rotation.z  = 0; lShin.rotation.y  = 0 }
      if (rFoot)  { rFoot.rotation.x  =  footW;        rFoot.rotation.z  = 0; rFoot.rotation.y  = 0 }
      if (lFoot)  { lFoot.rotation.x  =  footW;        lFoot.rotation.z  = 0; lFoot.rotation.y  = 0 }
      if (spine)  spine.rotation.x = spineX
      if (chest)  chest.rotation.x = spineX * 0.4
      if (rArm)   rArm.rotation.z  =  REST_ARM_Z - armLift
      if (lArm)   lArm.rotation.z  = -REST_ARM_Z + armLift
    },
  },

  no: {
    duration: 1.8,
    fn(t, vrm) {
      const h    = vrm.humanoid
      const neck = h.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const head = h.getNormalizedBoneNode(VRMHumanBoneName.Head)
      const rArm = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      const fade = t < 0.12 ? smoothstep(t / 0.12) : t > 0.85 ? smoothstep((1 - t) / 0.15) : 1

      // 3 deliberate side-to-side shakes
      const shake = Math.sin(t * Math.PI * 6) * fade

      if (neck) neck.rotation.y = shake * 0.38
      if (head) head.rotation.y = shake * 0.12

      if (rArm) rArm.rotation.z =  REST_ARM_Z
      if (lArm) lArm.rotation.z = -REST_ARM_Z
    },
  },

  yes: {
    duration: 2.0,
    fn(t, vrm) {
      const h    = vrm.humanoid
      const neck = h.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const head = h.getNormalizedBoneNode(VRMHumanBoneName.Head)
      const rArm = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      // fade in / fade out
      const fade = t < 0.12 ? smoothstep(t / 0.12) : t > 0.85 ? smoothstep((1 - t) / 0.15) : 1

      // 3 affirmative nods: larger amplitude than the generic nod, slight spine involvement
      const nod = Math.max(0, Math.sin(t * Math.PI * 6)) * fade

      if (neck) neck.rotation.x = nod * 0.30
      if (head) head.rotation.x = nod * 0.12

      if (rArm) rArm.rotation.z =  REST_ARM_Z
      if (lArm) lArm.rotation.z = -REST_ARM_Z
    },
  },

  dance: {
    duration: 3.0,
    fn(t, vrm) {
      const h     = vrm.humanoid
      const hips  = h.getNormalizedBoneNode(VRMHumanBoneName.Hips)
      const spine = h.getNormalizedBoneNode(VRMHumanBoneName.Spine)
      const chest = h.getNormalizedBoneNode(VRMHumanBoneName.Chest)
      const neck  = h.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const rArm  = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const lArm  = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)

      const fade = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1
      const sway = Math.sin(t * Math.PI * 4) * fade
      // Hips move at half frequency, opposite phase to spine — classic hip sway
      const hipSway = Math.sin(t * Math.PI * 4 + Math.PI) * fade

      const hipsRestY = (vrm.scene.userData["hipsRestY"] as number) ?? 0
      const rThigh = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperLeg)
      const lThigh = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperLeg)
      const rFoot  = h.getNormalizedBoneNode(VRMHumanBoneName.RightFoot)
      const lFoot  = h.getNormalizedBoneNode(VRMHumanBoneName.LeftFoot)

      if (hips) {
        hips.position.y = hipsRestY
        hips.rotation.z = hipSway * 0.18
        hips.rotation.y = hipSway * 0.06
      }

      // Counter-rotate thighs so legs stay vertical when hips tilt
      if (rThigh) { rThigh.rotation.z = -hipSway * 0.18; rThigh.rotation.x = 0; rThigh.rotation.y = 0 }
      if (lThigh) { lThigh.rotation.z = -hipSway * 0.18; lThigh.rotation.x = 0; lThigh.rotation.y = 0 }
      // Feet stay flat
      if (rFoot)  { rFoot.rotation.x = 0; rFoot.rotation.z = 0; rFoot.rotation.y = 0 }
      if (lFoot)  { lFoot.rotation.x = 0; lFoot.rotation.z = 0; lFoot.rotation.y = 0 }

      if (spine) spine.rotation.z = sway * 0.10
      if (chest) chest.rotation.z = -sway * 0.07
      if (neck)  neck.rotation.z  = Math.sin(t * Math.PI * 4 + Math.PI / 4) * 0.07 * fade

      if (rArm) { rArm.rotation.z = REST_ARM_Z - sway * 0.5; rArm.rotation.x = Math.abs(sway) * 0.1 }
      if (lArm) { lArm.rotation.z = -REST_ARM_Z + sway * 0.5; lArm.rotation.x = Math.abs(sway) * 0.1 }
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
  private _pendingGesture: Gesture | null = null

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
    if (!this.vrm) return
    if (this._gestureActive) {
      // Accelerate current gesture to its exit phase (~82%), then queue the new one
      const exitPhase = this._gestureDuration * 0.82
      if (this._gestureElapsed < exitPhase) this._gestureElapsed = exitPhase
      this._pendingGesture = gesture
      return
    }
    this._startGesture(gesture)
  }

  private _startGesture(gesture: Gesture): void {
    const def = VRM_GESTURES[gesture]
    if (!def || !this.vrm) return
    const vrm = this.vrm
    this._gestureActive   = true
    this._gestureElapsed  = 0
    this._gestureDuration = def.duration
    this._gestureUpdateFn = (t) => def.fn(t, vrm)
    this._pendingGesture  = null
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
      if (this._pendingGesture) this._startGesture(this._pendingGesture)
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
    if (rArm) rArm.rotation.z =  Math.PI / 6
    if (lArm) lArm.rotation.z = -Math.PI / 6
    // Save natural hips Y so gestures can offset from it without breaking idle pose
    const hips = h.getNormalizedBoneNode(VRMHumanBoneName.Hips)
    if (hips) this.vrm.scene.userData["hipsRestY"] = hips.position.y
  }

  private _updateVRMProceduralIdle(t: number): void {
    if (!this.vrm) return
    const h = this.vrm.humanoid

    // Restore hips to natural rest Y in case a gesture displaced it
    const hips = h.getNormalizedBoneNode(VRMHumanBoneName.Hips)
    if (hips) hips.position.y = (this.vrm.scene.userData["hipsRestY"] as number) ?? 0

    // Breathing rhythm drives everything
    const breathe = Math.sin(t * 1.8)
    const sway    = Math.sin(t * 0.7)

    const spine = h.getNormalizedBoneNode(VRMHumanBoneName.Spine)
    const chest = h.getNormalizedBoneNode(VRMHumanBoneName.Chest)
    if (spine) spine.rotation.z = sway * 0.008
    if (chest) chest.rotation.x = breathe * 0.015

    // Arms closer to body (PI/6 ≈ 30° vs old PI/5 = 36°), sway gently with breathing
    const rArm = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
    const lArm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
    if (rArm) { rArm.rotation.z = Math.PI / 3.2 + breathe * 0.018; rArm.rotation.y = 0; rArm.rotation.x = 0 }
    if (lArm) { lArm.rotation.z = -(Math.PI / 3.2 + breathe * 0.018); lArm.rotation.y = 0; lArm.rotation.x = 0 }

    // Forearms: slight natural droop so hands don't hang stiffly
    const rForearm = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
    const lForearm = h.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm)
    if (rForearm) { rForearm.rotation.order = 'XYZ'; rForearm.rotation.z = -0.10; rForearm.rotation.y = 0; rForearm.rotation.x = 0 }
    if (lForearm) { lForearm.rotation.z =  0.10; lForearm.rotation.y = 0; lForearm.rotation.x = 0 }

    // Hands: slight downward tilt for a relaxed look
    const rHand = h.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
    const lHand = h.getNormalizedBoneNode(VRMHumanBoneName.LeftHand)
    if (rHand) { rHand.rotation.x = -0.15; rHand.rotation.y = 0; rHand.rotation.z = 0 }
    if (lHand) { lHand.rotation.x = -0.15; lHand.rotation.y = 0; lHand.rotation.z = 0 }

    // Fingers: relaxed natural curl using Z axis (VRM curl direction)
    const fingerCurl = 0.28 + breathe * 0.06
    const rFingers: [VRMHumanBoneName, VRMHumanBoneName, VRMHumanBoneName][] = [
      [VRMHumanBoneName.RightIndexProximal,  VRMHumanBoneName.RightIndexIntermediate,  VRMHumanBoneName.RightIndexDistal],
      [VRMHumanBoneName.RightMiddleProximal, VRMHumanBoneName.RightMiddleIntermediate, VRMHumanBoneName.RightMiddleDistal],
      [VRMHumanBoneName.RightRingProximal,   VRMHumanBoneName.RightRingIntermediate,   VRMHumanBoneName.RightRingDistal],
      [VRMHumanBoneName.RightLittleProximal, VRMHumanBoneName.RightLittleIntermediate, VRMHumanBoneName.RightLittleDistal],
    ]
    for (const [prox, mid, dist] of rFingers) {
      const p = h.getNormalizedBoneNode(prox)
      const m = h.getNormalizedBoneNode(mid)
      const d = h.getNormalizedBoneNode(dist)
      if (p) { p.rotation.z = fingerCurl; p.rotation.x = 0 }
      if (m) { m.rotation.z = fingerCurl * 0.8; m.rotation.x = 0 }
      if (d) { d.rotation.z = fingerCurl * 0.5; d.rotation.x = 0 }
    }
    const lFingers: [VRMHumanBoneName, VRMHumanBoneName, VRMHumanBoneName][] = [
      [VRMHumanBoneName.LeftIndexProximal,  VRMHumanBoneName.LeftIndexIntermediate,  VRMHumanBoneName.LeftIndexDistal],
      [VRMHumanBoneName.LeftMiddleProximal, VRMHumanBoneName.LeftMiddleIntermediate, VRMHumanBoneName.LeftMiddleDistal],
      [VRMHumanBoneName.LeftRingProximal,   VRMHumanBoneName.LeftRingIntermediate,   VRMHumanBoneName.LeftRingDistal],
      [VRMHumanBoneName.LeftLittleProximal, VRMHumanBoneName.LeftLittleIntermediate, VRMHumanBoneName.LeftLittleDistal],
    ]
    for (const [prox, mid, dist] of lFingers) {
      const p = h.getNormalizedBoneNode(prox)
      const m = h.getNormalizedBoneNode(mid)
      const d = h.getNormalizedBoneNode(dist)
      if (p) { p.rotation.z = -fingerCurl; p.rotation.x = 0 }
      if (m) { m.rotation.z = -fingerCurl * 0.8; m.rotation.x = 0 }
      if (d) { d.rotation.z = -fingerCurl * 0.5; d.rotation.x = 0 }
    }
    // Thumbs
    const rThumb = h.getNormalizedBoneNode(VRMHumanBoneName.RightThumbProximal)
    const lThumb = h.getNormalizedBoneNode(VRMHumanBoneName.LeftThumbProximal)
    if (rThumb) { rThumb.rotation.z = -0.3; rThumb.rotation.x = 0.2 }
    if (lThumb) { lThumb.rotation.z =  0.3; lThumb.rotation.x = 0.2 }
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
    this._pendingGesture  = null
  }
}
