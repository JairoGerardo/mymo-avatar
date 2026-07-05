import { Avatar } from "@mymosdk/avatar"
import type { AvatarPosition } from "@mymosdk/avatar"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { VRMLoaderPlugin, VRMHumanBoneName, type VRM } from "@pixiv/three-vrm"

// Replace with any GLB/VRM URL hosted on a CORS-enabled CDN (e.g. Cloudflare R2,
// GitHub Pages, or your own server). GitHub Releases URLs don't support CORS
// and cannot be loaded directly from the browser.
// const MODEL = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb"
const MODEL = "/Maya.vrm";


const log = document.getElementById("log")!
const ampBar = document.getElementById("amp-bar")!
const ampWrap = document.getElementById("amp-wrap")!

function setLog(msg: string, active = false): void {
  log.textContent = msg
  log.className = active ? "active" : ""
  if (active) setTimeout(() => (log.className = ""), 2000)
}

const INITIAL_FRAMING = "full"

const FRAMING_CONFIG = {
  full: { from: 0.00, lookBias: 0.50 },
  half: { from: 0.48, lookBias: 0.60 },
  bust: { from: 0.60, lookBias: 0.70 },
  face: { from: 0.76, lookBias: 0.58 },
}

const INITIAL_THEME = "dark"

const THEME_CONFIG = {
  dark:  { background: "radial-gradient(circle at 40% 35%, #2a2a4a 0%, #0d0d1a 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.08)" },
  light: { background: "radial-gradient(circle at 40% 35%, #f8f8ff 0%, #e0e0f0 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 0 0 2px rgba(0,0,0,0.06)" },
}

const avatar = new Avatar({
  model: MODEL,
  framing: INITIAL_FRAMING,
  position: "bottom-right",
  size: 400,
  theme: INITIAL_THEME,
  idle: true,
  idleInterval: 6000,
  blink: true,
  blinkInterval: 3000,
  lipSync: true,
  draggable: true,
  zIndex: 9999,
  framingConfig: FRAMING_CONFIG,
  themeConfig: THEME_CONFIG,
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

// ── Demo voice audio ─────────────────────────────────────────────────────────

async function loadDemoAudio(): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  // Same CORS rule applies: use a local file or a CORS-enabled CDN URL in production.
  const response = await fetch("/demo_voice_example.mp3")
  const arrayBuffer = await response.arrayBuffer()
  return ctx.decodeAudioData(arrayBuffer)
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
  clap:      () => avatar.clap(),
  jump:      () => avatar.jump(),
  dance:     () => avatar.dance(),
  thumbsUp:  () => avatar.thumbsUp(),
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
    loadDemoAudio().then(buffer => avatar.talk(buffer)).catch(console.error)
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
  // Theme
  "theme-light":       () => avatar.setTheme("light"),
  "theme-dark":        () => avatar.setTheme("dark"),
  "theme-transparent": () => avatar.setTheme("transparent"),
}

// ── Theme config color pickers ────────────────────────────────────────────────

const themeSlices = {
  dark:  { color1: "#2a2a4a", color2: "#0d0d1a", shadowOpacity: 0.5 },
  light: { color1: "#f8f8ff", color2: "#e0e0f0", shadowOpacity: 0.15 },
}

let currentThemeMode: "dark" | "light" = "dark"

const tcConfigPanel = document.getElementById("tc-config-panel")!
const tcColor1      = document.getElementById("tc-color1")  as HTMLInputElement
const tcColor2      = document.getElementById("tc-color2")  as HTMLInputElement
const tcShadow      = document.getElementById("tc-shadow")  as HTMLInputElement
const tcShadowVal   = document.getElementById("tc-shadow-val")!

function buildThemeConfig(mode: "dark" | "light") {
  const { color1, color2, shadowOpacity } = themeSlices[mode]
  const ringOpacity = mode === "dark" ? 0.08 : 0.06
  const ringColor   = mode === "dark" ? "255,255,255" : "0,0,0"
  return {
    background: `radial-gradient(circle at 40% 35%, ${color1} 0%, ${color2} 100%)`,
    boxShadow:  `0 8px 32px rgba(0,0,0,${shadowOpacity}), 0 0 0 2px rgba(${ringColor},${ringOpacity})`,
  }
}

function syncThemePickers(mode: "dark" | "light"): void {
  const s = themeSlices[mode]
  tcColor1.value          = s.color1
  tcColor2.value          = s.color2
  tcShadow.value          = String(s.shadowOpacity)
  tcShadowVal.textContent = s.shadowOpacity.toFixed(2)
}

function applyThemeConfig(mode: "dark" | "light"): void {
  avatar.setThemeConfig({ [mode]: buildThemeConfig(mode) })
}

tcColor1.addEventListener("input", () => {
  themeSlices[currentThemeMode].color1 = tcColor1.value
  applyThemeConfig(currentThemeMode)
  setLog(`themeConfig.${currentThemeMode}.center = ${tcColor1.value}`, true)
})

tcColor2.addEventListener("input", () => {
  themeSlices[currentThemeMode].color2 = tcColor2.value
  applyThemeConfig(currentThemeMode)
  setLog(`themeConfig.${currentThemeMode}.edge = ${tcColor2.value}`, true)
})

tcShadow.addEventListener("input", () => {
  const v = parseFloat(tcShadow.value)
  tcShadowVal.textContent = v.toFixed(2)
  themeSlices[currentThemeMode].shadowOpacity = v
  applyThemeConfig(currentThemeMode)
  setLog(`themeConfig.${currentThemeMode}.shadow = ${v.toFixed(2)}`, true)
})

syncThemePickers(currentThemeMode)
tcConfigPanel.style.display = ""

// ── Framing buttons + config sliders ─────────────────────────────────────────

let currentFraming = INITIAL_FRAMING

const framingSlices: Record<string, { from: number; lookBias: number }> = {
  full: { ...FRAMING_CONFIG.full },
  half: { ...FRAMING_CONFIG.half },
  bust: { ...FRAMING_CONFIG.bust },
  face: { ...FRAMING_CONFIG.face },
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

// ── Size slider ───────────────────────────────────────────────────────────────

const sizeSlider = document.getElementById("size-slider") as HTMLInputElement
const sizeVal    = document.getElementById("size-val")!

sizeSlider.addEventListener("input", () => {
  const px = parseInt(sizeSlider.value, 10)
  sizeVal.textContent = String(px)
  avatar.size(px)
  setLog(`avatar.size(${px})`, true)
})

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

    // Track active theme button and sync config panel
    if (btn.dataset["theme"]) {
      document.querySelectorAll<HTMLButtonElement>("button[data-theme]").forEach(b => b.classList.remove("active"))
      btn.classList.add("active")
      const theme = btn.dataset["theme"] as "dark" | "light" | "transparent"
      if (theme === "transparent") {
        tcConfigPanel.style.display = "none"
      } else {
        currentThemeMode = theme
        syncThemePickers(currentThemeMode)
        tcConfigPanel.style.display = ""
      }
    }

    setLog(`avatar.${action}()`, true)
    ACTIONS[action]?.()
  })
})

// Mark initial active buttons
document.querySelector<HTMLButtonElement>(`button[data-framing="${currentFraming}"]`)?.classList.add("active")
document.querySelector<HTMLButtonElement>(`button[data-theme="${INITIAL_THEME}"]`)?.classList.add("active")

// ── TTS Demo panel ───────────────────────────────────────────────────────────

const ttsProvider      = document.getElementById("tts-provider")       as HTMLSelectElement
const ttsApiKey        = document.getElementById("tts-apikey")          as HTMLInputElement
const ttsVoiceOpenAI   = document.getElementById("tts-voice-openai")    as HTMLSelectElement
const ttsVoiceElevenLabs = document.getElementById("tts-voice-elevenlabs") as HTMLInputElement
const ttsText          = document.getElementById("tts-text")            as HTMLTextAreaElement
const ttsSpeakBtn      = document.getElementById("tts-speak-btn")       as HTMLButtonElement
const ttsStatus        = document.getElementById("tts-status")!

const ELEVENLABS_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM" // Rachel

ttsProvider.addEventListener("change", () => {
  const isOpenAI = ttsProvider.value === "openai"
  ttsVoiceOpenAI.style.display      = isOpenAI ? "" : "none"
  ttsVoiceElevenLabs.style.display  = isOpenAI ? "none" : ""
  ttsApiKey.placeholder = isOpenAI ? "sk-…" : "Your ElevenLabs API key"
})

async function fetchTTSAudio(text: string): Promise<ArrayBuffer> {
  const apiKey = ttsApiKey.value.trim()
  if (!apiKey) throw new Error("Paste your API key first")

  if (ttsProvider.value === "openai") {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: ttsVoiceOpenAI.value,
        input: text,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `OpenAI error ${res.status}`)
    }
    return res.arrayBuffer()
  }

  // ElevenLabs
  const voiceId = ttsVoiceElevenLabs.value.trim() || ELEVENLABS_DEFAULT_VOICE
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}`)
  }
  return res.arrayBuffer()
}

ttsSpeakBtn.addEventListener("click", async () => {
  const text = ttsText.value.trim()
  if (!text) return

  ttsSpeakBtn.disabled = true
  ttsStatus.textContent = "Generating audio…"
  ttsStatus.style.color = "#60a5fa"

  try {
    const audio = await fetchTTSAudio(text)
    ttsStatus.textContent = "Playing…"
    await avatar.talk(audio)
    ttsStatus.textContent = "Done ✓"
    ttsStatus.style.color = "#a78bfa"
    setTimeout(() => { ttsStatus.textContent = "" }, 2000)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    ttsStatus.textContent = `Error: ${msg}`
    ttsStatus.style.color = "#f87171"
  } finally {
    ttsSpeakBtn.disabled = false
  }
})

// ── Model diagnostic — uncomment to inspect a GLB/VRM, re-comment when done ──
// async function inspectModel(url: string): Promise<void> {
//   const isVRM = url.endsWith(".vrm")
//   const loader = new GLTFLoader()
//   if (isVRM) loader.register((parser) => new VRMLoaderPlugin(parser))
//   const gltf = await loader.loadAsync(url)

//   const clips = gltf.animations.map((c) => c.name)
//   const bones: string[] = []
//   const morphTargets: Record<string, string[]> = {}
//   const scene = isVRM ? (gltf.userData["vrm"] as VRM).scene : gltf.scene

//   scene.traverse((obj) => {
//     if (obj instanceof THREE.Bone) bones.push(obj.name)
//     if (
//       (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) &&
//       obj.morphTargetDictionary
//     ) {
//       morphTargets[obj.name] = Object.keys(obj.morphTargetDictionary)
//     }
//   })

//   let headBoneResult = "NOT FOUND"
//   if (isVRM) {
//     const vrm = gltf.userData["vrm"] as VRM
//     const headNode = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)
//     headBoneResult = headNode ? `✓ VRM humanoid "${headNode.name}"` : "NOT FOUND"
//     const expressions = vrm.expressionManager
//       ? Object.keys(vrm.expressionManager.expressionMap)
//       : []
//     console.group(`%c[mymo] Model inspection: ${url}`, "color:#a78bfa;font-weight:bold")
//     console.log("Type: VRM")
//     console.log("Animation clips:", clips.length ? clips : "NONE")
//     console.log("VRM expressions:", expressions.length ? expressions : "NONE")
//     console.log("Raw morph targets:", Object.keys(morphTargets).length ? morphTargets : "NONE")
//     console.log("Head bone:", headBoneResult)
//     console.groupEnd()
//   } else {
//     const headBone = bones.find((b) => /^(head|mixamorigHead|Bip01_Head|HeadBone|bip_head)/i.test(b))
//     headBoneResult = headBone ?? "NOT FOUND"
//     console.group(`%c[mymo] Model inspection: ${url}`, "color:#a78bfa;font-weight:bold")
//     console.log("Type: GLB")
//     console.log("Animation clips:", clips.length ? clips : "NONE")
//     console.log("Bones:", bones.length ? bones : "NONE")
//     console.log("Morph targets:", Object.keys(morphTargets).length ? morphTargets : "NONE")
//     console.log("Head bone:", headBoneResult)
//     console.groupEnd()
//   }
// }
// inspectModel(MODEL).catch(console.error)
