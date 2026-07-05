<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue"
import { Avatar } from "@mymosdk/avatar"
import type { AvatarPosition, AvatarFraming, AvatarTheme } from "@mymosdk/avatar"

const MODEL = "/Maya.vrm"
const INITIAL_FRAMING: AvatarFraming = "full"
const INITIAL_THEME: AvatarTheme = "dark"

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

let avatar: Avatar
let ampRAF = 0
let logTimer: ReturnType<typeof setTimeout>

const logMsg      = ref("Initializing avatar...")
const logActive   = ref(false)
const talkingVisible = ref(false)
const sizeValue   = ref(400)
const activeFraming = ref<string>(INITIAL_FRAMING)
const activeTheme   = ref<string>(INITIAL_THEME)
const showTcPanel   = ref(true)
const currentThemeMode = ref<"dark" | "light">(INITIAL_THEME as "dark" | "light")

const framingSlices = reactive({
  full: { ...FRAMING_CONFIG.full },
  half: { ...FRAMING_CONFIG.half },
  bust: { ...FRAMING_CONFIG.bust },
  face: { ...FRAMING_CONFIG.face },
})
const themeSlices = reactive({
  dark:  { color1: "#2a2a4a", color2: "#0d0d1a", shadowOpacity: 0.5  },
  light: { color1: "#f8f8ff", color2: "#e0e0f0", shadowOpacity: 0.15 },
})

const fcCurrent = computed(() => framingSlices[activeFraming.value as keyof typeof framingSlices])
const tcCurrent = computed(() => themeSlices[currentThemeMode.value])

function setLog(msg: string, active = false) {
  logMsg.value    = msg
  logActive.value = active
  if (active) {
    clearTimeout(logTimer)
    logTimer = setTimeout(() => { logActive.value = false }, 2000)
  }
}

function buildThemeConfig(mode: "dark" | "light") {
  const { color1, color2, shadowOpacity } = themeSlices[mode]
  const ringOpacity = mode === "dark" ? 0.08 : 0.06
  const ringColor   = mode === "dark" ? "255,255,255" : "0,0,0"
  return {
    background: `radial-gradient(circle at 40% 35%, ${color1} 0%, ${color2} 100%)`,
    boxShadow:  `0 8px 32px rgba(0,0,0,${shadowOpacity}), 0 0 0 2px rgba(${ringColor},${ringOpacity})`,
  }
}

async function loadDemoAudio(): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  const res = await fetch("/demo_voice_example.mp3")
  return ctx.decodeAudioData(await res.arrayBuffer())
}

function startAmpViz() {
  const tick = () => { ampRAF = requestAnimationFrame(tick) }
  tick()
}
function stopAmpViz() { cancelAnimationFrame(ampRAF) }

const ACTIONS: Record<string, () => void> = {
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
}

function doAction(action: string) {
  setLog(`avatar.${action}()`, true)
  ACTIONS[action]?.()
}

function doFrame(framing: AvatarFraming) {
  activeFraming.value = framing
  avatar?.frame(framing)
  setLog(`avatar.frame("${framing}")`, true)
}

function doTheme(theme: AvatarTheme) {
  activeTheme.value = theme
  avatar?.setTheme(theme)
  if (theme === "transparent") {
    showTcPanel.value = false
  } else {
    currentThemeMode.value = theme as "dark" | "light"
    showTcPanel.value = true
  }
  setLog(`avatar.setTheme("${theme}")`, true)
}

function onSizeInput(e: Event) {
  const px = parseInt((e.target as HTMLInputElement).value, 10)
  sizeValue.value = px
  avatar?.size(px)
  setLog(`avatar.size(${px})`, true)
}

// ── TTS Demo ──────────────────────────────────────────────────────────────────

const ELEVENLABS_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"

const ttsProvider = ref("openai")
const ttsApiKey   = ref("")
const ttsVoice    = ref("nova")
const ttsText     = ref("Hello! I'm your Mymo avatar. How can I help you today?")
const ttsBusy     = ref(false)
const ttsStatus   = ref("")
const ttsStatusColor = ref("#555")

function onTtsProviderChange(e: Event) {
  ttsProvider.value = (e.target as HTMLSelectElement).value
  ttsVoice.value = ttsProvider.value === "openai" ? "nova" : ""
}

async function fetchTTSAudio(provider: string, apiKey: string, voice: string, text: string): Promise<ArrayBuffer> {
  if (!apiKey.trim()) throw new Error("Paste your API key first")
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice, input: text }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `OpenAI error ${res.status}`)
    }
    return res.arrayBuffer()
  }
  const voiceId = voice.trim() || ELEVENLABS_DEFAULT_VOICE
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}`)
  return res.arrayBuffer()
}

async function handleSpeak() {
  const text = ttsText.value.trim()
  if (!text) return
  ttsBusy.value = true
  ttsStatus.value = "Generating audio…"
  ttsStatusColor.value = "#60a5fa"
  try {
    const audio = await fetchTTSAudio(ttsProvider.value, ttsApiKey.value, ttsVoice.value, text)
    ttsStatus.value = "Playing…"
    await avatar.talk(audio)
    ttsStatus.value = "Done ✓"
    ttsStatusColor.value = "#a78bfa"
    setTimeout(() => { ttsStatus.value = "" }, 2000)
  } catch (err) {
    ttsStatus.value = `Error: ${err instanceof Error ? err.message : String(err)}`
    ttsStatusColor.value = "#f87171"
  } finally {
    ttsBusy.value = false
  }
}

function onFcFromInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  framingSlices[activeFraming.value as keyof typeof framingSlices].from = v
  avatar?.setFramingConfig({ [activeFraming.value]: framingSlices[activeFraming.value as keyof typeof framingSlices] })
  setLog(`framingConfig.${activeFraming.value}.from = ${v.toFixed(2)}`, true)
}

function onFcBiasInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  framingSlices[activeFraming.value as keyof typeof framingSlices].lookBias = v
  avatar?.setFramingConfig({ [activeFraming.value]: framingSlices[activeFraming.value as keyof typeof framingSlices] })
  setLog(`framingConfig.${activeFraming.value}.lookBias = ${v.toFixed(2)}`, true)
}

function onTcColor1Input(e: Event) {
  const v = (e.target as HTMLInputElement).value
  themeSlices[currentThemeMode.value].color1 = v
  avatar?.setThemeConfig({ [currentThemeMode.value]: buildThemeConfig(currentThemeMode.value) })
  setLog(`themeConfig.${currentThemeMode.value}.center = ${v}`, true)
}

function onTcColor2Input(e: Event) {
  const v = (e.target as HTMLInputElement).value
  themeSlices[currentThemeMode.value].color2 = v
  avatar?.setThemeConfig({ [currentThemeMode.value]: buildThemeConfig(currentThemeMode.value) })
  setLog(`themeConfig.${currentThemeMode.value}.edge = ${v}`, true)
}

function onTcShadowInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  themeSlices[currentThemeMode.value].shadowOpacity = v
  avatar?.setThemeConfig({ [currentThemeMode.value]: buildThemeConfig(currentThemeMode.value) })
  setLog(`themeConfig.${currentThemeMode.value}.shadow = ${v.toFixed(2)}`, true)
}

onMounted(() => {
  avatar = new Avatar({
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
    .on("loaded",         ()         => setLog("Avatar loaded ✓", true))
    .on("modelLoaded",    ()         => setLog("Model ready ✓", true))
    .on("click",          ()         => { avatar.wave(); setLog("avatar.wave()", true) })
    .on("animationStart", (_, data)  => setLog(`animationStart: ${JSON.stringify(data)}`, true))
    .on("speechStart",    ()         => { setLog("speechStart — talking…"); talkingVisible.value = true;  startAmpViz() })
    .on("speechEnd",      ()         => { setLog("speechEnd ✓", true);       talkingVisible.value = false; stopAmpViz()  })
})

onUnmounted(() => {
  avatar?.destroy()
  cancelAnimationFrame(ampRAF)
  clearTimeout(logTimer)
})
</script>

<template>
  <h1>Mymo Avatar</h1>
  <p class="subtitle">SDK Demo — lightweight animated avatar</p>

  <div class="controls">

    <div class="group">
      <span class="group-label">Expressions</span>
      <div class="btn-row">
        <button v-for="a in ['smile','happy','sad','angry','surprised','thinking','confused','sleep','idle']"
                :key="a" @click="doAction(a)">{{ a }}</button>
      </div>
    </div>

    <hr class="divider">

    <div class="group">
      <span class="group-label">Gestures</span>
      <div class="btn-row">
        <button v-for="a in ['wave','nod','yes','no','shakeHead','clap','jump','dance','thumbsUp']"
                :key="a" @click="doAction(a)">{{ a }}</button>
      </div>
    </div>

    <hr class="divider">

    <div class="group">
      <span class="group-label">States</span>
      <div class="btn-row">
        <button v-for="a in ['loading','success','error','warning','listening','typing','processing','complete','clearState']"
                :key="a" @click="doAction(a)">{{ a }}</button>
      </div>
    </div>

    <hr class="divider">

    <div class="inline-groups">
      <div class="group">
        <span class="group-label">Look</span>
        <div class="btn-row">
          <button @click="doAction('lookAtMouse')">follow mouse</button>
          <button @click="doAction('lookForward')">look forward</button>
          <button @click="doAction('randomLook')">random look</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">Speech</span>
        <div class="btn-row">
          <button @click="doAction('talk')">talk</button>
          <button @click="doAction('stopTalking')">stop</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">Position</span>
        <div class="btn-row">
          <button v-for="pos in ['bottom-right','bottom-left','top-right','top-left']"
                  :key="pos" @click="doAction(`pos-${pos}`)">{{ pos }}</button>
        </div>
      </div>
    </div>

    <hr class="divider">

    <div class="group">
      <span class="group-label">Size</span>
      <div class="slider-row" style="max-width:340px; width:100%;">
        <label>px</label>
        <input type="range" min="80" max="600" step="10" :value="sizeValue" @input="onSizeInput">
        <span class="val">{{ sizeValue }}</span>
      </div>
    </div>

    <hr class="divider">

    <div class="config-panel">

      <div class="config-box">
        <span class="group-label">Framing — <span>{{ activeFraming }}</span></span>
        <div class="btn-row">
          <button v-for="f in ['full','half','bust','face']" :key="f"
                  :class="{ active: activeFraming === f }" @click="doFrame(f as AvatarFraming)">{{ f }}</button>
        </div>
        <div class="slider-row">
          <label>from</label>
          <input type="range" min="0" max="1" step="0.01" :value="fcCurrent.from" @input="onFcFromInput">
          <span class="val">{{ fcCurrent.from.toFixed(2) }}</span>
        </div>
        <div class="slider-row">
          <label>lookBias</label>
          <input type="range" min="0" max="1" step="0.01" :value="fcCurrent.lookBias" @input="onFcBiasInput">
          <span class="val">{{ fcCurrent.lookBias.toFixed(2) }}</span>
        </div>
      </div>

      <div class="config-box">
        <span class="group-label">Theme</span>
        <div class="btn-row">
          <button v-for="t in ['light','dark','transparent']" :key="t"
                  :class="{ active: activeTheme === t }" @click="doTheme(t as AvatarTheme)">{{ t }}</button>
        </div>

        <template v-if="showTcPanel">
          <div class="color-row">
            <label>center</label>
            <input type="color" :value="tcCurrent.color1" @input="onTcColor1Input">
            <label>edge</label>
            <input type="color" :value="tcCurrent.color2" @input="onTcColor2Input">
          </div>
          <div class="slider-row">
            <label>shadow</label>
            <input type="range" min="0" max="1" step="0.05" :value="tcCurrent.shadowOpacity" @input="onTcShadowInput">
            <span class="val">{{ tcCurrent.shadowOpacity.toFixed(2) }}</span>
          </div>
        </template>
      </div>

      <hr class="divider">

      <!-- TTS Demo -->
      <div class="tts-panel">
        <span class="group-label tts-label">TTS Demo — speak with AI</span>
        <p class="tts-warning">
          ⚠️ For testing only — paste your key to try TTS directly from the browser.<br>
          Never ship API keys in frontend code. Use a backend proxy in production.
        </p>
        <div class="tts-row">
          <label class="tts-field-label">Provider</label>
          <select :value="ttsProvider" @change="onTtsProviderChange" class="tts-input">
            <option value="openai">OpenAI TTS</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>
        <div class="tts-row">
          <label class="tts-field-label">API Key</label>
          <input type="password" :value="ttsApiKey" @input="ttsApiKey = ($event.target as HTMLInputElement).value"
            :placeholder="ttsProvider === 'openai' ? 'sk-…' : 'Your ElevenLabs API key'"
            class="tts-input" autocomplete="off" />
        </div>
        <div class="tts-row">
          <label class="tts-field-label">Voice</label>
          <select v-if="ttsProvider === 'openai'" :value="ttsVoice" @change="ttsVoice = ($event.target as HTMLSelectElement).value" class="tts-input">
            <option v-for="v in ['alloy','echo','fable','nova','onyx','shimmer']" :key="v" :value="v">{{ v }}</option>
          </select>
          <input v-else type="text" :value="ttsVoice" @input="ttsVoice = ($event.target as HTMLInputElement).value"
            placeholder="Voice ID (e.g. 21m00Tcm4TlvDq8ikWAM)" class="tts-input" />
        </div>
        <textarea :value="ttsText" @input="ttsText = ($event.target as HTMLTextAreaElement).value"
          placeholder="Type something for the avatar to say…" class="tts-textarea" />
        <button @click="handleSpeak" :disabled="ttsBusy" class="tts-speak-btn">🔊 Speak</button>
        <div class="tts-status" :style="{ color: ttsStatusColor }">{{ ttsStatus }}</div>
      </div>

    </div>
  </div>

  <div v-if="talkingVisible" style="display:flex; align-items:center; gap:0.5rem; width:260px;">
    <span style="font-size:0.7rem; color:#a78bfa;">🎙️ talking</span>
    <div style="flex:1; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
      <div style="height:100%; width:30%; background:linear-gradient(90deg,#a78bfa,#60a5fa); border-radius:3px; transition:width 0.05s ease;"></div>
    </div>
  </div>

  <div id="log" :class="{ active: logActive }">{{ logMsg }}</div>
</template>

<style scoped>
h1 {
  font-size: 2rem; font-weight: 700;
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
.subtitle { font-size: 0.9rem; color: #888; margin-top: -1rem; }

.controls { display: flex; flex-direction: column; gap: 1rem; align-items: center; width: 100%; max-width: 680px; }
.group { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; width: 100%; }
.group-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; color: #666; }
.btn-row { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; }

button {
  padding: 0.45rem 0.9rem;
  border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 8px;
  background: rgba(167, 139, 250, 0.08); color: #c4b5fd;
  font-size: 0.8rem; cursor: pointer; transition: all 0.15s ease;
}
button:hover { background: rgba(167, 139, 250, 0.2); border-color: rgba(167, 139, 250, 0.6); color: #fff; }
button:active { transform: scale(0.96); }
button.active { background: rgba(167, 139, 250, 0.3); border-color: rgba(167, 139, 250, 0.9); color: #fff; }

.divider { width: 100%; border: none; border-top: 1px solid rgba(167, 139, 250, 0.1); }

.inline-groups { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; width: 100%; }
.inline-groups .group { width: auto; align-items: center; }

.config-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; }
.config-box {
  display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem;
  border: 1px solid rgba(167, 139, 250, 0.15); border-radius: 10px;
  background: rgba(167, 139, 250, 0.04);
}

.slider-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #aaa; width: 100%; }
.slider-row label { min-width: 4rem; text-align: right; color: #888; }
.slider-row input[type="range"] { flex: 1; accent-color: #a78bfa; cursor: pointer; }
.slider-row .val { min-width: 2.5rem; font-family: monospace; color: #c4b5fd; }

.color-row { display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.75rem; color: #888; }
input[type="color"] {
  width: 2.2rem; height: 1.5rem; cursor: pointer;
  border: 1px solid rgba(167,139,250,0.3); border-radius: 4px;
  background: none; padding: 1px;
}

#log { font-size: 0.75rem; color: #555; font-family: monospace; height: 1.2rem; transition: color 0.3s; }
#log.active { color: #a78bfa; }

.tts-panel {
  display: flex; flex-direction: column; gap: 0.6rem;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(96,165,250,0.25); border-radius: 12px;
  background: rgba(96,165,250,0.04); width: 100%;
}
.tts-label { color: #60a5fa; }
.tts-warning {
  font-size: 0.68rem; color: #f59e0b;
  background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25);
  border-radius: 6px; padding: 0.4rem 0.6rem; text-align: center; line-height: 1.4;
}
.tts-row { display: flex; gap: 0.5rem; align-items: center; width: 100%; flex-wrap: wrap; }
.tts-field-label { font-size: 0.72rem; color: #888; min-width: 4.5rem; text-align: right; }
.tts-input {
  flex: 1; min-width: 0; padding: 0.35rem 0.55rem;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(167,139,250,0.2);
  border-radius: 6px; color: #e0e0ff; font-size: 0.78rem;
}
.tts-input option { background: #1a1a3e; }
.tts-textarea {
  width: 100%; padding: 0.45rem 0.6rem;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(167,139,250,0.2);
  border-radius: 6px; color: #e0e0ff; font-size: 0.82rem;
  resize: vertical; min-height: 56px; font-family: inherit;
}
.tts-speak-btn {
  border: 1px solid rgba(96,165,250,0.4) !important;
  background: rgba(96,165,250,0.1) !important;
  color: #93c5fd !important; width: 100%; font-size: 0.85rem; padding: 0.55rem;
}
.tts-speak-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.tts-status { font-size: 0.72rem; font-family: monospace; text-align: center; min-height: 1rem; }
</style>
