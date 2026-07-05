import { Avatar } from "@mymosdk/avatar"
import type { AvatarPosition } from "@mymosdk/avatar"

const MODEL = "/Maya.vrm"

const log     = document.getElementById("log")!
const ampBar  = document.getElementById("amp-bar")!
const ampWrap = document.getElementById("amp-wrap")!

function setLog(msg: string, active = false): void {
  log.textContent = msg
  log.className   = active ? "active" : ""
  if (active) setTimeout(() => (log.className = ""), 2000)
}

const INITIAL_FRAMING = "full"
const INITIAL_THEME   = "dark"

const FRAMING_CONFIG = {
  full: { from: 0.00, lookBias: 0.50 },
  half: { from: 0.48, lookBias: 0.60 },
  bust: { from: 0.60, lookBias: 0.70 },
  face: { from: 0.76, lookBias: 0.58 },
}
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

let ampRAF = 0
function startAmpViz() {
  const tick = () => { ampRAF = requestAnimationFrame(tick) }
  tick()
}
function stopAmpViz() {
  cancelAnimationFrame(ampRAF)
  ampBar.style.width = "0%"
}

avatar
  .on("loaded",         ()         => setLog("Avatar loaded ✓", true))
  .on("modelLoaded",    ()         => setLog("Model ready ✓", true))
  .on("click",          ()         => { avatar.wave(); setLog("avatar.wave()", true) })
  .on("animationStart", (_, data)  => setLog(`animationStart: ${JSON.stringify(data)}`, true))
  .on("speechStart",    ()         => { setLog("speechStart — talking…"); ampWrap.style.display = "flex"; startAmpViz() })
  .on("speechEnd",      ()         => { setLog("speechEnd ✓", true); ampWrap.style.display = "none"; stopAmpViz() })

async function loadDemoAudio(): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  const res = await fetch("/demo_voice_example.mp3")
  return ctx.decodeAudioData(await res.arrayBuffer())
}

type ActionFn = () => void
const ACTIONS: Record<string, ActionFn> = {
  smile:     () => avatar.smile(),
  happy:     () => avatar.happy(),
  sad:       () => avatar.sad(),
  angry:     () => avatar.angry(),
  surprised: () => avatar.surprised(),
  thinking:  () => avatar.thinking(),
  confused:  () => avatar.confused(),
  sleep:     () => avatar.sleep(),
  idle:      () => avatar.idle(),
  wave:      () => avatar.wave(),
  nod:       () => avatar.nod(),
  yes:       () => avatar.yes(),
  no:        () => avatar.no(),
  shakeHead: () => avatar.shakeHead(),
  clap:      () => avatar.clap(),
  jump:      () => avatar.jump(),
  dance:     () => avatar.dance(),
  thumbsUp:  () => avatar.thumbsUp(),
  loading:    () => avatar.loading(),
  success:    () => avatar.success(),
  error:      () => avatar.error(),
  warning:    () => avatar.warning(),
  listening:  () => avatar.listening(),
  typing:     () => avatar.typing(),
  processing: () => avatar.processing(),
  complete:   () => avatar.complete(),
  clearState: () => avatar.clearState(),
  lookAtMouse:  () => avatar.lookAtMouse(),
  lookForward:  () => avatar.lookForward(),
  randomLook:   () => avatar.randomLook(),
  talk:         () => loadDemoAudio().then(b => avatar.talk(b)).catch(console.error),
  stopTalking:  () => avatar.stopTalking(),
  "pos-bottom-right": () => avatar.position("bottom-right" as AvatarPosition),
  "pos-bottom-left":  () => avatar.position("bottom-left"  as AvatarPosition),
  "pos-top-right":    () => avatar.position("top-right"    as AvatarPosition),
  "pos-top-left":     () => avatar.position("top-left"     as AvatarPosition),
  "frame-full":  () => avatar.frame("full"),
  "frame-half":  () => avatar.frame("half"),
  "frame-bust":  () => avatar.frame("bust"),
  "frame-face":  () => avatar.frame("face"),
  "theme-light":       () => avatar.setTheme("light"),
  "theme-dark":        () => avatar.setTheme("dark"),
  "theme-transparent": () => avatar.setTheme("transparent"),
}

// ── Theme config ──────────────────────────────────────────────────────────────

const themeSlices = {
  dark:  { color1: "#2a2a4a", color2: "#0d0d1a", shadowOpacity: 0.5  },
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

tcColor1.addEventListener("input", () => {
  themeSlices[currentThemeMode].color1 = tcColor1.value
  avatar.setThemeConfig({ [currentThemeMode]: buildThemeConfig(currentThemeMode) })
  setLog(`themeConfig.${currentThemeMode}.center = ${tcColor1.value}`, true)
})
tcColor2.addEventListener("input", () => {
  themeSlices[currentThemeMode].color2 = tcColor2.value
  avatar.setThemeConfig({ [currentThemeMode]: buildThemeConfig(currentThemeMode) })
  setLog(`themeConfig.${currentThemeMode}.edge = ${tcColor2.value}`, true)
})
tcShadow.addEventListener("input", () => {
  const v = parseFloat(tcShadow.value)
  tcShadowVal.textContent = v.toFixed(2)
  themeSlices[currentThemeMode].shadowOpacity = v
  avatar.setThemeConfig({ [currentThemeMode]: buildThemeConfig(currentThemeMode) })
  setLog(`themeConfig.${currentThemeMode}.shadow = ${v.toFixed(2)}`, true)
})
syncThemePickers(currentThemeMode)

// ── Framing config ────────────────────────────────────────────────────────────

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
  fcFromSlider.value    = String(cfg.from)
  fcBiasSlider.value    = String(cfg.lookBias)
  fcFromVal.textContent = cfg.from.toFixed(2)
  fcBiasVal.textContent = cfg.lookBias.toFixed(2)
  fcModeLabel.textContent = mode
}

fcFromSlider.addEventListener("input", () => {
  const v = parseFloat(fcFromSlider.value)
  fcFromVal.textContent = v.toFixed(2)
  framingSlices[currentFraming]!.from = v
  avatar.setFramingConfig({ [currentFraming]: framingSlices[currentFraming] })
  setLog(`framingConfig.${currentFraming}.from = ${v.toFixed(2)}`, true)
})
fcBiasSlider.addEventListener("input", () => {
  const v = parseFloat(fcBiasSlider.value)
  fcBiasVal.textContent = v.toFixed(2)
  framingSlices[currentFraming]!.lookBias = v
  avatar.setFramingConfig({ [currentFraming]: framingSlices[currentFraming] })
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

// ── Button dispatch ───────────────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset["action"]!

    if (btn.dataset["framing"]) {
      document.querySelectorAll<HTMLButtonElement>("button[data-framing]").forEach(b => b.classList.remove("active"))
      btn.classList.add("active")
      currentFraming = btn.dataset["framing"]
      syncSliders(currentFraming)
    }

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

document.querySelector<HTMLButtonElement>(`button[data-framing="${currentFraming}"]`)?.classList.add("active")
document.querySelector<HTMLButtonElement>(`button[data-theme="${INITIAL_THEME}"]`)?.classList.add("active")
