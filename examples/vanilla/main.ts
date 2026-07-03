import { Avatar } from "@mymo/avatar"
import type { AvatarPosition } from "@mymo/avatar"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { VRMLoaderPlugin, VRMHumanBoneName, type VRM } from "@pixiv/three-vrm"

const ROBOT_GLB = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb"


const log = document.getElementById("log")!
const ampBar = document.getElementById("amp-bar")!
const ampWrap = document.getElementById("amp-wrap")!

function setLog(msg: string, active = false): void {
  log.textContent = msg
  log.className = active ? "active" : ""
  if (active) setTimeout(() => (log.className = ""), 2000)
}

const avatar = new Avatar({
  // model: ROBOT_GLB,
  // model: "/girl.vrm",
  // model: "/Mark.vrm",
  model: "/Maya.vrm",
  framing: "full",
  position: "bottom-right",
  size: 600,
  theme: "dark",
  idle: true,
  idleInterval: 6000,
  blink: true,
  blinkInterval: 3000,
  lipSync: true,
  draggable: true,
  zIndex: 9999,
  // Per-model framing tuning — adjust these until the framing looks right for your GLB/VRM
  framingConfig: {
    full: { from: 0.00, lookBias: 0.50 },
    half: { from: 0.50, lookBias: 0.55 },
    bust: { from: 0.60, lookBias: 0.62 },
    face: { from: 0.72, lookBias: 0.65 },
  },
})

avatar
  .on("loaded", () => setLog("Avatar loaded ✓", true))
  .on("modelLoaded", () => {
    setLog("Model ready ✓", true);
    // avatar.debugBones() // toggle SkeletonHelper to verify bone rotations in real time
  })
  .on("click", () => { avatar.wave(); setLog("avatar.wave()", true) })
  .on("animationStart", (_: string, data: unknown) => setLog(`animationStart: ${JSON.stringify(data)}`, true))
  .on("speechStart", () => { setLog("speechStart — talking…"); ampWrap.style.display = "flex" })
  .on("speechEnd",  () => { setLog("speechEnd ✓", true);      ampWrap.style.display = "none" })

// ── Amplitude visualizer (runs during talk) ──────────────────────────────────

let ampRAF = 0
function startAmpViz(): void {
  const tick = () => {
    // Avatar doesn't expose raw amplitude, so we use a CSS animation driven by
    // the speechStart/End events. For real amplitude, tap AudioEngine directly.
    ampRAF = requestAnimationFrame(tick)
  }
  tick()
}
function stopAmpViz(): void {
  cancelAnimationFrame(ampRAF)
  ampBar.style.width = "0%"
}

avatar.on("speechStart", startAmpViz).on("speechEnd", stopAmpViz)

// ── Synthetic speech audio (no external dependency) ──────────────────────────
// Generates a short "voice-like" tone with amplitude variation to demo lip sync.

function createSpeechTone(durationSec = 3): AudioBuffer {
  const ctx = new AudioContext()
  const rate = ctx.sampleRate
  const buffer = ctx.createBuffer(1, rate * durationSec, rate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const t = i / rate
    // Carrier (voice pitch) modulated by a slow envelope (syllable rhythm)
    const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t)
    const carrier  = Math.sin(2 * Math.PI * 180 * t)
              + 0.4 * Math.sin(2 * Math.PI * 360 * t)
              + 0.2 * Math.sin(2 * Math.PI * 540 * t)
    data[i] = carrier * envelope * 0.3
  }
  ctx.close()
  return buffer
}

// ── Button actions ────────────────────────────────────────────────────────────

type ActionFn = () => void
const ACTIONS: Record<string, ActionFn> = {
  // Expressions
  smile:     () => avatar.smile(),
  happy:     () => avatar.happy(),
  sad:       () => avatar.sad(),
  angry:     () => avatar.angry(),
  surprised: () => avatar.surprised(),
  thinking:  () => avatar.thinking(),
  confused:  () => avatar.confused(),
  sleep:     () => avatar.sleep(),
  idle:      () => avatar.idle(),
  // Gestures
  wave:      () => avatar.wave(),
  nod:       () => avatar.nod(),
  yes:       () => avatar.yes(),
  no:        () => avatar.no(),
  shakeHead: () => avatar.shakeHead(),
  point:     () => avatar.point(),
  clap:      () => avatar.clap(),
  jump:      () => avatar.jump(),
  dance:     () => avatar.dance(),
  // States
  loading:    () => avatar.loading(),
  success:    () => avatar.success(),
  error:      () => avatar.error(),
  warning:    () => avatar.warning(),
  listening:  () => avatar.listening(),
  typing:     () => avatar.typing(),
  processing: () => avatar.processing(),
  complete:   () => avatar.complete(),
  clearState: () => avatar.clearState(),
  // Look
  lookAtMouse:  () => avatar.lookAtMouse(),
  lookForward:  () => avatar.lookForward(),
  randomLook:   () => avatar.randomLook(),
  // Speech
  talk: () => {
    const buffer = createSpeechTone(3)
    avatar.talk(buffer).catch(console.error)
  },
  stopTalking: () => avatar.stopTalking(),
  // Position
  "pos-bottom-right": () => avatar.position("bottom-right" as AvatarPosition),
  "pos-bottom-left":  () => avatar.position("bottom-left"  as AvatarPosition),
  "pos-top-right":    () => avatar.position("top-right"    as AvatarPosition),
  "pos-top-left":     () => avatar.position("top-left"     as AvatarPosition),
  // Framing
  "frame-full":  () => avatar.frame("full"),
  "frame-half":  () => avatar.frame("half"),
  "frame-bust":  () => avatar.frame("bust"),
  "frame-face":  () => avatar.frame("face"),
}

// ── Framing buttons + config sliders ─────────────────────────────────────────

let currentFraming = "full"

// Per-mode config (mirrors framingConfig passed to the Avatar constructor)
const framingSlices: Record<string, { from: number; lookBias: number }> = {
  full: { from: 0.00, lookBias: 0.50 },
  half: { from: 0.50, lookBias: 0.55 },
  bust: { from: 0.60, lookBias: 0.62 },
  face: { from: 0.72, lookBias: 0.65 },
}

const fcModeLabel  = document.getElementById("fc-mode-label")!
const fcFromSlider = document.getElementById("fc-from") as HTMLInputElement
const fcBiasSlider = document.getElementById("fc-bias") as HTMLInputElement
const fcFromVal    = document.getElementById("fc-from-val")!
const fcBiasVal    = document.getElementById("fc-bias-val")!

function syncSliders(mode: string): void {
  const cfg = framingSlices[mode]!
  fcFromSlider.value = String(cfg.from)
  fcBiasSlider.value = String(cfg.lookBias)
  fcFromVal.textContent = cfg.from.toFixed(2)
  fcBiasVal.textContent = cfg.lookBias.toFixed(2)
  fcModeLabel.textContent = mode
}

function applyFramingConfig(mode: string): void {
  avatar.setFramingConfig({ [mode]: framingSlices[mode] })
}

fcFromSlider.addEventListener("input", () => {
  const v = parseFloat(fcFromSlider.value)
  fcFromVal.textContent = v.toFixed(2)
  framingSlices[currentFraming]!.from = v
  applyFramingConfig(currentFraming)
  setLog(`framingConfig.${currentFraming}.from = ${v.toFixed(2)}`, true)
})

fcBiasSlider.addEventListener("input", () => {
  const v = parseFloat(fcBiasSlider.value)
  fcBiasVal.textContent = v.toFixed(2)
  framingSlices[currentFraming]!.lookBias = v
  applyFramingConfig(currentFraming)
  setLog(`framingConfig.${currentFraming}.lookBias = ${v.toFixed(2)}`, true)
})

syncSliders(currentFraming)

document.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset["action"]!

    // Track active framing button
    if (btn.dataset["framing"]) {
      document.querySelectorAll<HTMLButtonElement>("button[data-framing]").forEach(b => b.classList.remove("active"))
      btn.classList.add("active")
      currentFraming = btn.dataset["framing"]
      syncSliders(currentFraming)
    }

    setLog(`avatar.${action}()`, true)
    ACTIONS[action]?.()
  })
})

// Mark initial active framing button
document.querySelector<HTMLButtonElement>(`button[data-framing="${currentFraming}"]`)?.classList.add("active")

// ── Model diagnostic — uncomment to inspect a GLB/VRM, re-comment when done ──
async function inspectModel(url: string): Promise<void> {
  const isVRM = url.endsWith(".vrm")
  const loader = new GLTFLoader()
  if (isVRM) loader.register((parser) => new VRMLoaderPlugin(parser))
  const gltf = await loader.loadAsync(url)

  const clips = gltf.animations.map((c) => c.name)
  const bones: string[] = []
  const morphTargets: Record<string, string[]> = {}
  const scene = isVRM ? (gltf.userData["vrm"] as VRM).scene : gltf.scene

  scene.traverse((obj) => {
    if (obj instanceof THREE.Bone) bones.push(obj.name)
    if (
      (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) &&
      obj.morphTargetDictionary
    ) {
      morphTargets[obj.name] = Object.keys(obj.morphTargetDictionary)
    }
  })

  let headBoneResult = "NOT FOUND"
  if (isVRM) {
    const vrm = gltf.userData["vrm"] as VRM
    const headNode = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)
    headBoneResult = headNode ? `✓ VRM humanoid "${headNode.name}"` : "NOT FOUND"
    const expressions = vrm.expressionManager
      ? Object.keys(vrm.expressionManager.expressionMap)
      : []
    console.group(`%c[mymo] Model inspection: ${url}`, "color:#a78bfa;font-weight:bold")
    console.log("Type: VRM")
    console.log("Animation clips:", clips.length ? clips : "NONE")
    console.log("VRM expressions:", expressions.length ? expressions : "NONE")
    console.log("Raw morph targets:", Object.keys(morphTargets).length ? morphTargets : "NONE")
    console.log("Head bone:", headBoneResult)
    console.groupEnd()
  } else {
    const headBone = bones.find((b) => /^(head|mixamorigHead|Bip01_Head|HeadBone|bip_head)/i.test(b))
    headBoneResult = headBone ?? "NOT FOUND"
    console.group(`%c[mymo] Model inspection: ${url}`, "color:#a78bfa;font-weight:bold")
    console.log("Type: GLB")
    console.log("Animation clips:", clips.length ? clips : "NONE")
    console.log("Bones:", bones.length ? bones : "NONE")
    console.log("Morph targets:", Object.keys(morphTargets).length ? morphTargets : "NONE")
    console.log("Head bone:", headBoneResult)
    console.groupEnd()
  }
}
inspectModel("/woody_toy_story_v2_kh3.glb").catch(console.error)
