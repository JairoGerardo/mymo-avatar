<script setup lang="ts">
import { ref, computed, reactive, watch } from "vue"
import { useAvatar } from "@mymo/vue"
import type { AvatarPosition, AvatarFraming } from "@mymo/avatar"

const framingSlices = reactive({
  full: { from: 0.00, lookBias: 0.50 },
  half: { from: 0.50, lookBias: 0.55 },
  bust: { from: 0.60, lookBias: 0.62 },
  face: { from: 0.72, lookBias: 0.65 },
})

const avatar = useAvatar({
  model: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
  framing: "full",
  position: "bottom-right",
  size: 400,
  theme: "dark",
  idle: true,
  idleInterval: 6000,
  blink: true,
  blinkInterval: 3000,
  lipSync: true,
  draggable: true,
  zIndex: 9999,
  framingConfig: { ...framingSlices },
})

const log = ref("Initializing…")
const logActive = ref(false)
const talking = ref(false)
const activeFraming = ref<AvatarFraming>("full")

function flash(msg: string) {
  log.value = msg
  logActive.value = true
  setTimeout(() => (logActive.value = false), 2000)
}

watch(avatar, (a) => {
  if (!a) return
  a.on("loaded",         ()                       => flash("Avatar loaded ✓"))
  a.on("modelLoaded",    ()                       => flash("Model ready ✓"))
  a.on("click",          ()                       => { a.wave(); flash("avatar.wave()") })
  a.on("animationStart", (_: string, d: unknown)  => flash(`animationStart: ${JSON.stringify(d)}`))
  a.on("speechStart",    ()                       => { log.value = "speechStart — talking…"; logActive.value = false; talking.value = true })
  a.on("speechEnd",      ()                       => { flash("speechEnd ✓"); talking.value = false })
}, { immediate: true })

const av = () => avatar.value!

function act(label: string, fn: () => void) {
  flash(`avatar.${label}()`)
  fn()
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

const FRAMINGS: AvatarFraming[] = ["full", "half", "bust", "face"]

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
</script>

<template>
  <div class="page">
    <h1 class="title">Mymo Avatar — Vue</h1>
    <p class="subtitle">SDK Demo — lightweight animated avatar</p>

    <div class="controls">
      <div class="group">
        <span class="group-label">Expressions</span>
        <div class="btn-row">
          <button @click="act('smile',     () => av().smile())">smile</button>
          <button @click="act('happy',     () => av().happy())">happy</button>
          <button @click="act('sad',       () => av().sad())">sad</button>
          <button @click="act('angry',     () => av().angry())">angry</button>
          <button @click="act('surprised', () => av().surprised())">surprised</button>
          <button @click="act('thinking',  () => av().thinking())">thinking</button>
          <button @click="act('confused',  () => av().confused())">confused</button>
          <button @click="act('sleep',     () => av().sleep())">sleep</button>
          <button @click="act('idle',      () => av().idle())">idle</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">Gestures</span>
        <div class="btn-row">
          <button @click="act('wave',  () => av().wave())">wave</button>
          <button @click="act('nod',   () => av().nod())">nod</button>
          <button @click="act('dance', () => av().dance())">dance</button>
          <button @click="act('jump',  () => av().jump())">jump</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">States</span>
        <div class="btn-row">
          <button @click="act('loading',    () => av().loading())">loading</button>
          <button @click="act('success',    () => av().success())">success</button>
          <button @click="act('error',      () => av().error())">error</button>
          <button @click="act('warning',    () => av().warning())">warning</button>
          <button @click="act('listening',  () => av().listening())">listening</button>
          <button @click="act('typing',     () => av().typing())">typing</button>
          <button @click="act('processing', () => av().processing())">processing</button>
          <button @click="act('complete',   () => av().complete())">complete</button>
          <button @click="act('clearState', () => av().clearState())">clearState</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">Look</span>
        <div class="btn-row">
          <button @click="act('lookAtMouse', () => av().lookAtMouse())">lookAtMouse</button>
          <button @click="act('lookForward', () => av().lookForward())">lookForward</button>
          <button @click="act('randomLook',  () => av().randomLook())">randomLook</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">Speech</span>
        <div class="btn-row">
          <button @click="act('talk',        () => av().talk(createSpeechTone(3)).catch(console.error))">talk</button>
          <button @click="act('stopTalking', () => av().stopTalking())">stopTalking</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">Position</span>
        <div class="btn-row">
          <button @click="act('pos-bottom-right', () => av().position('bottom-right' as AvatarPosition))">bottom-right</button>
          <button @click="act('pos-bottom-left',  () => av().position('bottom-left'  as AvatarPosition))">bottom-left</button>
          <button @click="act('pos-top-right',    () => av().position('top-right'    as AvatarPosition))">top-right</button>
          <button @click="act('pos-top-left',     () => av().position('top-left'     as AvatarPosition))">top-left</button>
        </div>
      </div>

      <div class="group">
        <span class="group-label">Framing</span>
        <div class="btn-row">
          <button
            v-for="m in FRAMINGS" :key="m"
            :class="{ active: activeFraming === m }"
            @click="selectFraming(m)"
          >{{ m }}</button>
        </div>
      </div>

      <div class="group framing-cfg">
        <span class="group-label">Framing Config — {{ activeFraming }}</span>
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
  gap: 2rem;
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

.subtitle { font-size: 0.9rem; color: #888; margin-top: -1.5rem; }

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  max-width: 600px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
}

.group-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #666;
}

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

.framing-cfg { width: 100%; max-width: 340px; }

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #aaa;
  width: 100%;
}

.slider-row label { min-width: 4.5rem; text-align: right; color: #888; }
.slider-row input[type="range"] { flex: 1; accent-color: #a78bfa; cursor: pointer; }
.val { min-width: 2.5rem; font-family: monospace; color: #c4b5fd; }

.amp-wrap { display: flex; align-items: center; gap: 0.5rem; width: 260px; }
.amp-label { font-size: 0.7rem; color: #a78bfa; }
.amp-track { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.amp-bar { height: 100%; width: 60%; background: linear-gradient(90deg, #a78bfa, #60a5fa); border-radius: 3px; }

.log {
  font-size: 0.75rem;
  color: #555;
  font-family: monospace;
  height: 1.2rem;
  transition: color 0.3s;
}

.log.active { color: #a78bfa; }
</style>
