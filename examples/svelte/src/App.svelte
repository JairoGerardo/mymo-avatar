<script lang="ts">
  import { onMount, onDestroy } from "svelte"
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
  let logMsg  = "Initializing avatar..."
  let logActive = false
  let logTimer: ReturnType<typeof setTimeout>
  let talkingVisible = false
  let ampRAF = 0

  let sizeValue = 400
  let activeFraming: string = INITIAL_FRAMING
  let activeTheme: string   = INITIAL_THEME
  let showTcPanel = true
  let currentThemeMode: "dark" | "light" = INITIAL_THEME as "dark" | "light"

  let framingSlices = {
    full: { ...FRAMING_CONFIG.full },
    half: { ...FRAMING_CONFIG.half },
    bust: { ...FRAMING_CONFIG.bust },
    face: { ...FRAMING_CONFIG.face },
  }
  let themeSlices = {
    dark:  { color1: "#2a2a4a", color2: "#0d0d1a", shadowOpacity: 0.5  },
    light: { color1: "#f8f8ff", color2: "#e0e0f0", shadowOpacity: 0.15 },
  }

  $: fcCurrent = framingSlices[activeFraming as keyof typeof framingSlices]
  $: tcCurrent = themeSlices[currentThemeMode]

  function setLog(msg: string, active = false) {
    logMsg    = msg
    logActive = active
    if (active) {
      clearTimeout(logTimer)
      logTimer = setTimeout(() => { logActive = false }, 2000)
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

  type ActionKey = string
  function doAction(action: ActionKey) {
    if (!avatar) return
    setLog(`avatar.${action}()`, true)
    const map: Record<string, () => void> = {
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
    map[action]?.()
  }

  function doFrame(framing: string) {
    activeFraming = framing
    avatar?.frame(framing as AvatarFraming)
    setLog(`avatar.frame("${framing}")`, true)
  }

  function doTheme(theme: string) {
    activeTheme = theme
    avatar?.setTheme(theme as AvatarTheme)
    if (theme === "transparent") {
      showTcPanel = false
    } else {
      currentThemeMode = theme as "dark" | "light"
      showTcPanel = true
    }
    setLog(`avatar.setTheme("${theme}")`, true)
  }

  function onSizeInput(e: Event) {
    const px = parseInt((e.target as HTMLInputElement).value, 10)
    sizeValue = px
    avatar?.size(px)
    setLog(`avatar.size(${px})`, true)
  }

  function onFcFromInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value)
    framingSlices[activeFraming as keyof typeof framingSlices].from = v
    framingSlices = { ...framingSlices }
    avatar?.setFramingConfig({ [activeFraming]: framingSlices[activeFraming as keyof typeof framingSlices] })
    setLog(`framingConfig.${activeFraming}.from = ${v.toFixed(2)}`, true)
  }

  function onFcBiasInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value)
    framingSlices[activeFraming as keyof typeof framingSlices].lookBias = v
    framingSlices = { ...framingSlices }
    avatar?.setFramingConfig({ [activeFraming]: framingSlices[activeFraming as keyof typeof framingSlices] })
    setLog(`framingConfig.${activeFraming}.lookBias = ${v.toFixed(2)}`, true)
  }

  function onTcColor1Input(e: Event) {
    const v = (e.target as HTMLInputElement).value
    themeSlices[currentThemeMode].color1 = v
    themeSlices = { ...themeSlices }
    avatar?.setThemeConfig({ [currentThemeMode]: buildThemeConfig(currentThemeMode) })
    setLog(`themeConfig.${currentThemeMode}.center = ${v}`, true)
  }

  function onTcColor2Input(e: Event) {
    const v = (e.target as HTMLInputElement).value
    themeSlices[currentThemeMode].color2 = v
    themeSlices = { ...themeSlices }
    avatar?.setThemeConfig({ [currentThemeMode]: buildThemeConfig(currentThemeMode) })
    setLog(`themeConfig.${currentThemeMode}.edge = ${v}`, true)
  }

  function onTcShadowInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value)
    themeSlices[currentThemeMode].shadowOpacity = v
    themeSlices = { ...themeSlices }
    avatar?.setThemeConfig({ [currentThemeMode]: buildThemeConfig(currentThemeMode) })
    setLog(`themeConfig.${currentThemeMode}.shadow = ${v.toFixed(2)}`, true)
  }

  onMount(() => {
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
      .on("loaded",         ()          => setLog("Avatar loaded ✓", true))
      .on("modelLoaded",    ()          => setLog("Model ready ✓", true))
      .on("click",          ()          => { avatar.wave(); setLog("avatar.wave()", true) })
      .on("animationStart", (_, data)   => setLog(`animationStart: ${JSON.stringify(data)}`, true))
      .on("speechStart",    ()          => { setLog("speechStart — talking…"); talkingVisible = true;  startAmpViz() })
      .on("speechEnd",      ()          => { setLog("speechEnd ✓", true);       talkingVisible = false; stopAmpViz()  })
  })

  onDestroy(() => {
    avatar?.destroy()
    cancelAnimationFrame(ampRAF)
    clearTimeout(logTimer)
  })
</script>

<h1>Mymo Avatar</h1>
<p class="subtitle">SDK Demo — lightweight animated avatar</p>

<div class="controls">

  <div class="group">
    <span class="group-label">Expressions</span>
    <div class="btn-row">
      {#each ["smile","happy","sad","angry","surprised","thinking","confused","sleep","idle"] as a}
        <button on:click={() => doAction(a)}>{a}</button>
      {/each}
    </div>
  </div>

  <hr class="divider">

  <div class="group">
    <span class="group-label">Gestures</span>
    <div class="btn-row">
      {#each ["wave","nod","yes","no","shakeHead","clap","jump","dance","thumbsUp"] as a}
        <button on:click={() => doAction(a)}>{a}</button>
      {/each}
    </div>
  </div>

  <hr class="divider">

  <div class="group">
    <span class="group-label">States</span>
    <div class="btn-row">
      {#each ["loading","success","error","warning","listening","typing","processing","complete","clearState"] as a}
        <button on:click={() => doAction(a)}>{a}</button>
      {/each}
    </div>
  </div>

  <hr class="divider">

  <div class="inline-groups">
    <div class="group">
      <span class="group-label">Look</span>
      <div class="btn-row">
        <button on:click={() => doAction("lookAtMouse")}>follow mouse</button>
        <button on:click={() => doAction("lookForward")}>look forward</button>
        <button on:click={() => doAction("randomLook")}>random look</button>
      </div>
    </div>

    <div class="group">
      <span class="group-label">Speech</span>
      <div class="btn-row">
        <button on:click={() => doAction("talk")}>talk</button>
        <button on:click={() => doAction("stopTalking")}>stop</button>
      </div>
    </div>

    <div class="group">
      <span class="group-label">Position</span>
      <div class="btn-row">
        {#each ["bottom-right","bottom-left","top-right","top-left"] as pos}
          <button on:click={() => doAction(`pos-${pos}`)}>{pos}</button>
        {/each}
      </div>
    </div>
  </div>

  <hr class="divider">

  <div class="group">
    <span class="group-label">Size</span>
    <div class="slider-row" style="max-width:340px; width:100%;">
      <label>px</label>
      <input type="range" min="80" max="600" step="10" value={sizeValue} on:input={onSizeInput}>
      <span class="val">{sizeValue}</span>
    </div>
  </div>

  <hr class="divider">

  <div class="config-panel">

    <div class="config-box">
      <span class="group-label">Framing — <span>{activeFraming}</span></span>
      <div class="btn-row">
        {#each ["full","half","bust","face"] as f}
          <button class:active={activeFraming === f} on:click={() => doFrame(f)}>{f}</button>
        {/each}
      </div>
      <div class="slider-row">
        <label>from</label>
        <input type="range" min="0" max="1" step="0.01" value={fcCurrent.from} on:input={onFcFromInput}>
        <span class="val">{fcCurrent.from.toFixed(2)}</span>
      </div>
      <div class="slider-row">
        <label>lookBias</label>
        <input type="range" min="0" max="1" step="0.01" value={fcCurrent.lookBias} on:input={onFcBiasInput}>
        <span class="val">{fcCurrent.lookBias.toFixed(2)}</span>
      </div>
    </div>

    <div class="config-box">
      <span class="group-label">Theme</span>
      <div class="btn-row">
        {#each ["light","dark","transparent"] as t}
          <button class:active={activeTheme === t} on:click={() => doTheme(t)}>{t}</button>
        {/each}
      </div>

      {#if showTcPanel}
        <div class="color-row">
          <label>center</label>
          <input type="color" value={tcCurrent.color1} on:input={onTcColor1Input}>
          <label>edge</label>
          <input type="color" value={tcCurrent.color2} on:input={onTcColor2Input}>
        </div>
        <div class="slider-row">
          <label>shadow</label>
          <input type="range" min="0" max="1" step="0.05" value={tcCurrent.shadowOpacity} on:input={onTcShadowInput}>
          <span class="val">{tcCurrent.shadowOpacity.toFixed(2)}</span>
        </div>
      {/if}
    </div>

  </div>
</div>

{#if talkingVisible}
  <div class="amp-wrap">
    <span style="font-size:0.7rem; color:#a78bfa;">🎙️ talking</span>
    <div style="flex:1; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
      <div style="height:100%; width:30%; background:linear-gradient(90deg,#a78bfa,#60a5fa); border-radius:3px; transition:width 0.05s ease;"></div>
    </div>
  </div>
{/if}

<div id="log" class:active={logActive}>{logMsg}</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
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

  h1 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #a78bfa, #60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }
  .subtitle { font-size: 0.9rem; color: #888; margin-top: -1rem; }

  .controls {
    display: flex; flex-direction: column; gap: 1rem;
    align-items: center; width: 100%; max-width: 680px;
  }
  .group { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; width: 100%; }
  .group-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .btn-row { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; }

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
  button:hover { background: rgba(167, 139, 250, 0.2); border-color: rgba(167, 139, 250, 0.6); color: #fff; }
  button:active { transform: scale(0.96); }
  button.active { background: rgba(167, 139, 250, 0.3); border-color: rgba(167, 139, 250, 0.9); color: #fff; }

  .divider { width: 100%; border: none; border-top: 1px solid rgba(167, 139, 250, 0.1); }

  .inline-groups { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; width: 100%; }
  .inline-groups .group { width: auto; align-items: center; }

  .config-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; }
  .config-box {
    display: flex; flex-direction: column; gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid rgba(167, 139, 250, 0.15);
    border-radius: 10px;
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

  .amp-wrap { display: flex; align-items: center; gap: 0.5rem; width: 260px; }

  #log { font-size: 0.75rem; color: #555; font-family: monospace; height: 1.2rem; transition: color 0.3s; }
  #log.active { color: #a78bfa; }
</style>
