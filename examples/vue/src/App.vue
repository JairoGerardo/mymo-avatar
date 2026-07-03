<script setup lang="ts">
import { ref, computed, reactive, watch } from "vue"
import { useAvatar } from "@mymo/avatar/vue"
import type { AvatarPosition, AvatarFraming, AvatarTheme } from "@mymo/avatar"

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_FRAMING: AvatarFraming = "full"
const INITIAL_THEME: AvatarTheme = "dark"

const FRAMING_CONFIG = {
  full: { from: 0.00, lookBias: 0.50 },
  half: { from: 0.48, lookBias: 0.60 },
  bust: { from: 0.60, lookBias: 0.70 },
  face: { from: 0.76, lookBias: 0.58 },
}

const THEME_CONFIG = {
  dark:  { color1: "#2a2a4a", color2: "#0d0d1a", shadowOpacity: 0.5  },
  light: { color1: "#f8f8ff", color2: "#e0e0f0", shadowOpacity: 0.15 },
}

type ThemeMode = "dark" | "light"

function buildThemeCss(mode: ThemeMode, slices: typeof THEME_CONFIG) {
  const { color1, color2, shadowOpacity } = slices[mode]
  const ringOpacity = mode === "dark" ? 0.08 : 0.06
  const ringColor   = mode === "dark" ? "255,255,255" : "0,0,0"
  return {
    background: `radial-gradient(circle at 40% 35%, ${color1} 0%, ${color2} 100%)`,
    boxShadow:  `0 8px 32px rgba(0,0,0,${shadowOpacity}), 0 0 0 2px rgba(${ringColor},${ringOpacity})`,
  }
}

function createSpeechTone(durationSec = 3): AudioBuffer {
  const ctx = new AudioContext()
  const rate = ctx.sampleRate
  const buffer = ctx.createBuffer(1, rate * durationSec, rate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const t = i / rate
    const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t)
    const carrier =
      Math.sin(2 * Math.PI * 180 * t) +
      0.4 * Math.sin(2 * Math.PI * 360 * t) +
      0.2 * Math.sin(2 * Math.PI * 540 * t)
    data[i] = carrier * envelope * 0.3
  }
  ctx.close()
  return buffer
}

// ── State ─────────────────────────────────────────────────────────────────────

const framingSlices = reactive({ ...FRAMING_CONFIG })
const themeSlices   = reactive({ ...THEME_CONFIG })

const avatar = useAvatar({
  //model: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
  model: "/Maya.vrm",
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
  themeConfig: {
    dark:  buildThemeCss("dark",  THEME_CONFIG),
    light: buildThemeCss("light", THEME_CONFIG),
  },
})

const log          = ref("Initializing…")
const logActive    = ref(false)
const talking      = ref(false)
const activeFraming = ref<AvatarFraming>(INITIAL_FRAMING)
const activeTheme  = ref<AvatarTheme>(INITIAL_THEME)
const themeMode    = ref<ThemeMode>("dark")

// ── Helpers ───────────────────────────────────────────────────────────────────

function flash(msg: string) {
  log.value = msg
  logActive.value = true
  setTimeout(() => (logActive.value = false), 2000)
}

watch(avatar, (a) => {
  if (!a) return
  a.on("loaded",         ()                      => flash("Avatar loaded ✓"))
  a.on("modelLoaded",    ()                      => flash("Model ready ✓"))
  a.on("click",          ()                      => { a.wave(); flash("avatar.wave()") })
  a.on("animationStart", (_: string, d: unknown) => flash(`animationStart: ${JSON.stringify(d)}`))
  a.on("speechStart",    ()                      => { log.value = "speechStart — talking…"; logActive.value = false; talking.value = true })
  a.on("speechEnd",      ()                      => { flash("speechEnd ✓"); talking.value = false })
}, { immediate: true })

const av = () => avatar.value!

function act(label: string, fn: () => void) {
  flash(`avatar.${label}()`)
  fn()
}

// ── Framing ───────────────────────────────────────────────────────────────────

const FRAMINGS: AvatarFraming[] = ["full", "half", "bust", "face"]
const THEMES: AvatarTheme[]     = ["light", "dark", "transparent"]
const THEME_LABELS: Record<AvatarTheme, string> = { light: "☀️ light", dark: "🌙 dark", transparent: "◻️ transparent" }

function selectFraming(mode: AvatarFraming) {
  activeFraming.value = mode
  av().frame(mode)
  flash(`avatar.frame("${mode}")`)
}

function updateSlice(mode: AvatarFraming, key: "from" | "lookBias", value: number) {
  framingSlices[mode][key] = value
  avatar.value?.setFramingConfig({ [mode]: framingSlices[mode] })
  flash(`framingConfig.${mode}.${key} = ${value.toFixed(2)}`)
}

const cfg = computed(() => framingSlices[activeFraming.value])

// ── Theme ─────────────────────────────────────────────────────────────────────

function selectTheme(theme: AvatarTheme) {
  activeTheme.value = theme
  if (theme !== "transparent") themeMode.value = theme
  av().setTheme(theme)
  flash(`avatar.setTheme("${theme}")`)
}

function updateThemeSlice(mode: ThemeMode, key: "color1" | "color2" | "shadowOpacity", value: string | number) {
  (themeSlices[mode] as Record<string, string | number>)[key] = value
  avatar.value?.setThemeConfig({ [mode]: buildThemeCss(mode, themeSlices) })
  flash(`themeConfig.${mode}.${key} updated`)
}

const themeCfg = computed(() => themeSlices[themeMode.value])

// ── Size ──────────────────────────────────────────────────────────────────────

const avatarSize = ref(400)

function updateSize(px: number) {
  avatarSize.value = px
  av().size(px)
  flash(`avatar.size(${px})`)
}
</script>

<template>
  <div class="page">
    <h1 class="title">Mymo Avatar — Vue</h1>
    <p class="subtitle">SDK Demo — lightweight animated avatar</p>

    <div class="controls">

      <!-- Expressions -->
      <div class="group">
        <span class="group-label">Expressions</span>
        <div class="btn-row">
          <button @click="act('smile',     () => av().smile())">😊 smile</button>
          <button @click="act('happy',     () => av().happy())">😄 happy</button>
          <button @click="act('sad',       () => av().sad())">😢 sad</button>
          <button @click="act('angry',     () => av().angry())">😠 angry</button>
          <button @click="act('surprised', () => av().surprised())">😲 surprised</button>
          <button @click="act('thinking',  () => av().thinking())">🤔 thinking</button>
          <button @click="act('confused',  () => av().confused())">😕 confused</button>
          <button @click="act('sleep',     () => av().sleep())">😴 sleep</button>
          <button @click="act('idle',      () => av().idle())">😐 idle</button>
        </div>
      </div>

      <hr class="divider" />

      <!-- Gestures -->
      <div class="group">
        <span class="group-label">Gestures</span>
        <div class="btn-row">
          <button @click="act('wave',      () => av().wave())">👋 wave</button>
          <button @click="act('nod',       () => av().nod())">↕️ nod</button>
          <button @click="act('yes',       () => av().yes())">✅ yes</button>
          <button @click="act('no',        () => av().no())">❌ no</button>
          <button @click="act('shakeHead', () => av().shakeHead())">🙅 shakeHead</button>
          <button @click="act('clap',      () => av().clap())">👏 clap</button>
          <button @click="act('jump',      () => av().jump())">⬆️ jump</button>
          <button @click="act('dance',     () => av().dance())">💃 dance</button>
          <button @click="act('thumbsUp',  () => av().thumbsUp())">👍 thumbsUp</button>
        </div>
      </div>

      <hr class="divider" />

      <!-- States -->
      <div class="group">
        <span class="group-label">States</span>
        <div class="btn-row">
          <button @click="act('loading',    () => av().loading())">⏳ loading</button>
          <button @click="act('success',    () => av().success())">✅ success</button>
          <button @click="act('error',      () => av().error())">❌ error</button>
          <button @click="act('warning',    () => av().warning())">⚠️ warning</button>
          <button @click="act('listening',  () => av().listening())">👂 listening</button>
          <button @click="act('typing',     () => av().typing())">⌨️ typing</button>
          <button @click="act('processing', () => av().processing())">⚙️ processing</button>
          <button @click="act('complete',   () => av().complete())">🏁 complete</button>
          <button @click="act('clearState', () => av().clearState())">✖ clear</button>
        </div>
      </div>

      <hr class="divider" />

      <!-- Look · Speech · Position -->
      <div class="inline-row">
        <div class="group inline-group">
          <span class="group-label">Look</span>
          <div class="btn-row">
            <button @click="act('lookAtMouse', () => av().lookAtMouse())">👁️ follow mouse</button>
            <button @click="act('lookForward', () => av().lookForward())">⬛ look forward</button>
            <button @click="act('randomLook',  () => av().randomLook())">🔀 random look</button>
          </div>
        </div>
        <div class="group inline-group">
          <span class="group-label">Speech</span>
          <div class="btn-row">
            <button @click="act('talk',        () => av().talk(createSpeechTone(3)).catch(console.error))">🗣️ talk</button>
            <button @click="act('stopTalking', () => av().stopTalking())">🔇 stop</button>
          </div>
        </div>
        <div class="group inline-group">
          <span class="group-label">Position</span>
          <div class="btn-row">
            <button @click="act('pos-bottom-right', () => av().position('bottom-right' as AvatarPosition))">↘ bottom-right</button>
            <button @click="act('pos-bottom-left',  () => av().position('bottom-left'  as AvatarPosition))">↙ bottom-left</button>
            <button @click="act('pos-top-right',    () => av().position('top-right'    as AvatarPosition))">↗ top-right</button>
            <button @click="act('pos-top-left',     () => av().position('top-left'     as AvatarPosition))">↖ top-left</button>
          </div>
        </div>
      </div>

      <hr class="divider" />

      <!-- Size -->
      <div class="group">
        <span class="group-label">Size</span>
        <div class="slider-row" style="max-width:340px; width:100%;">
          <label>px</label>
          <input type="range" min="80" max="600" step="10" :value="avatarSize"
            @input="updateSize(parseInt(($event.target as HTMLInputElement).value, 10))" />
          <span class="val">{{ avatarSize }}</span>
        </div>
      </div>

      <hr class="divider" />

      <!-- Framing + Theme config panel -->
      <div class="config-panel">

        <!-- Framing -->
        <div class="config-box">
          <span class="group-label center">Framing — {{ activeFraming }}</span>
          <div class="btn-row">
            <button
              v-for="m in FRAMINGS" :key="m"
              :class="{ active: activeFraming === m }"
              @click="selectFraming(m)"
            >{{ m }}</button>
          </div>
          <div class="slider-row">
            <label>from</label>
            <input type="range" min="0" max="1" step="0.01" :value="cfg.from"
              @input="updateSlice(activeFraming, 'from', parseFloat(($event.target as HTMLInputElement).value))" />
            <span class="val">{{ cfg.from.toFixed(2) }}</span>
          </div>
          <div class="slider-row">
            <label>lookBias</label>
            <input type="range" min="0" max="1" step="0.01" :value="cfg.lookBias"
              @input="updateSlice(activeFraming, 'lookBias', parseFloat(($event.target as HTMLInputElement).value))" />
            <span class="val">{{ cfg.lookBias.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Theme -->
        <div class="config-box">
          <span class="group-label center">Theme</span>
          <div class="btn-row">
            <button
              v-for="t in THEMES" :key="t"
              :class="{ active: activeTheme === t }"
              @click="selectTheme(t)"
            >{{ THEME_LABELS[t] }}</button>
          </div>
          <template v-if="activeTheme !== 'transparent'">
            <div class="color-row">
              <label>center</label>
              <input type="color" :value="themeCfg.color1"
                @input="updateThemeSlice(themeMode, 'color1', ($event.target as HTMLInputElement).value)" />
              <label>edge</label>
              <input type="color" :value="themeCfg.color2"
                @input="updateThemeSlice(themeMode, 'color2', ($event.target as HTMLInputElement).value)" />
            </div>
            <div class="slider-row">
              <label>shadow</label>
              <input type="range" min="0" max="1" step="0.05" :value="themeCfg.shadowOpacity"
                @input="updateThemeSlice(themeMode, 'shadowOpacity', parseFloat(($event.target as HTMLInputElement).value))" />
              <span class="val">{{ themeCfg.shadowOpacity.toFixed(2) }}</span>
            </div>
          </template>
        </div>

      </div>
    </div>

    <div v-if="talking" class="amp-wrap">
      <span class="amp-label">🎙️ talking</span>
      <div class="amp-track">
        <div class="amp-bar" />
      </div>
    </div>

    <div class="log" :class="{ active: logActive }">{{ log }}</div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.page {
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1117 100%);
  min-height: 100vh;
  color: #e0e0ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.subtitle { font-size: 0.9rem; color: #888; margin-top: -1rem; }

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  width: 100%;
  max-width: 680px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
  width: 100%;
}

.inline-group { width: auto; }

.group-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #666;
}

.group-label.center { align-self: center; }

.btn-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}

button {
  padding: 0.45rem 0.9rem;
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 8px;
  background: rgba(167, 139, 250, 0.08);
  color: #c4b5fd;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
button:hover {
  background: rgba(167, 139, 250, 0.2);
  border-color: rgba(167, 139, 250, 0.6);
  color: #fff;
}
button.active {
  background: rgba(167, 139, 250, 0.3);
  border-color: rgba(167, 139, 250, 0.9);
  color: #fff;
}

.divider {
  width: 100%;
  border: none;
  border-top: 1px solid rgba(167, 139, 250, 0.1);
}

.inline-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.config-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
}

.config-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid rgba(167, 139, 250, 0.15);
  border-radius: 10px;
  background: rgba(167, 139, 250, 0.04);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #aaa;
  width: 100%;
}
.slider-row label { min-width: 4rem; text-align: right; color: #888; }
.slider-row input[type="range"] { flex: 1; accent-color: #a78bfa; cursor: pointer; }
.val { min-width: 2.5rem; font-family: monospace; color: #c4b5fd; }

.color-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #888;
}
input[type="color"] {
  width: 2.2rem;
  height: 1.5rem;
  cursor: pointer;
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 4px;
  background: none;
  padding: 1px;
}

.amp-wrap { display: flex; align-items: center; gap: 0.5rem; width: 260px; }
.amp-label { font-size: 0.7rem; color: #a78bfa; }
.amp-track { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.amp-bar { height: 100%; width: 60%; background: linear-gradient(90deg, #a78bfa, #60a5fa); border-radius: 3px; }

.log { font-size: 0.75rem; color: #555; font-family: monospace; height: 1.2rem; transition: color 0.3s; }
.log.active { color: #a78bfa; }
</style>
