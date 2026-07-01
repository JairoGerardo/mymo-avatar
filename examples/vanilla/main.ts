import { Avatar } from "@mymo/avatar"
import type { AvatarPosition } from "@mymo/avatar"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

const ROBOT_GLB = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb"
// const FACECAP_GLB = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/facecap.glb"


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
  model: "/girl.vrm",
  framing: "half",
  // model: "/stylized_female_head_demo_only_head.glb",
  position: "bottom-right",
  size: 400,
  theme: "dark",
  idle: true,
  idleInterval: 6000,
  blink: true,
  blinkInterval: 3000,
  lipSync: true,
  draggable: true,
  zIndex: 9999
})

avatar
  .on("loaded", () => setLog("Avatar loaded ✓", true))
  .on("modelLoaded", () => setLog("Model ready ✓", true))
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
  wave:  () => avatar.wave(),
  nod:   () => avatar.nod(),
  dance: () => avatar.dance(),
  jump:  () => avatar.jump(),
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

document.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset["action"]!
    setLog(`avatar.${action}()`, true)
    ACTIONS[action]?.()
  })
})

// ── Model diagnostic — uncomment to inspect a GLB/VRM, re-comment when done ──
async function inspectModel(url: string): Promise<void> {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(url)
  const clips = gltf.animations.map((c) => c.name)
  const bones: string[] = []
  const morphTargets: Record<string, string[]> = {}
  gltf.scene.traverse((obj) => {
    if (obj instanceof THREE.Bone) bones.push(obj.name)
    if (
      (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) &&
      obj.morphTargetDictionary
    ) {
      morphTargets[obj.name] = Object.keys(obj.morphTargetDictionary)
    }
  })
  console.group(`%c[mymo] Model inspection: ${url}`, "color:#a78bfa;font-weight:bold")
  console.log("Animation clips:", clips.length ? clips : "NONE")
  console.log("Bones:", bones.length ? bones : "NONE")
  console.log("Morph targets:", Object.keys(morphTargets).length ? morphTargets : "NONE")
  const headBone = bones.find((b) => /^(head|mixamorigHead|Bip01_Head|HeadBone|bip_head)/i.test(b))
  console.log("Head bone detected:", headBone ?? "NOT FOUND")
  console.groupEnd()
}
inspectModel("/girl.vrm").catch(console.error)
