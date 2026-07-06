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

  // ── TTS Demo ────────────────────────────────────────────────────────────────

  const ELEVENLABS_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"

  let ttsProvider = "openai"
  let ttsApiKey   = ""
  let ttsVoice    = "nova"
  let ttsText     = "Hello! I'm your Mymo avatar. How can I help you today?"
  let ttsBusy     = false
  let ttsStatus   = ""
  let ttsStatusColor = "#555"

  function onTtsProviderChange(e: Event) {
    ttsProvider = (e.target as HTMLSelectElement).value
    ttsVoice = ttsProvider === "openai" ? "nova" : ""
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
    const text = ttsText.trim()
    if (!text) return
    ttsBusy = true
    ttsStatus = "Generating audio…"
    ttsStatusColor = "#60a5fa"
    try {
      const audio = await fetchTTSAudio(ttsProvider, ttsApiKey, ttsVoice, text)
      ttsStatus = "Playing…"
      await avatar.talk(audio)
      ttsStatus = "Done ✓"
      ttsStatusColor = "#a78bfa"
      setTimeout(() => { ttsStatus = "" }, 2000)
    } catch (err) {
      ttsStatus = `Error: ${err instanceof Error ? err.message : String(err)}`
      ttsStatusColor = "#f87171"
    } finally {
      ttsBusy = false
    }
  }

  // ── Chat Demo ──────────────────────────────────────────────────────────────

  type ChatMsg = { role: "user" | "assistant"; content: string }

  let chatHistory: ChatMsg[]    = []
  let chatApiKey                = ""
  let chatModel                 = "claude-sonnet-4-6"
  let chatSystem                = "You are a helpful assistant."
  let chatTts                   = false
  let chatInput                 = ""
  let chatBusy                  = false
  let chatStatus                = ""
  let chatStatusColor           = "#555"
  let chatMessagesEl: HTMLElement | null = null

  async function streamAnthropicSSE(messages: ChatMsg[]): Promise<string> {
    if (!chatApiKey.trim()) throw new Error("Paste your Anthropic API key first")
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": chatApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: chatModel,
        max_tokens: 1024,
        system: chatSystem || "You are a helpful assistant.",
        stream: true,
        messages,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Anthropic error ${res.status}`)
    }
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ""
    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const data = line.slice(6).trim()
        if (data === "[DONE]") break
        try {
          const evt = JSON.parse(data)
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            fullText += evt.delta.text
          }
        } catch {}
      }
    }
    return fullText
  }

  async function handleChatSend() {
    const text = chatInput.trim()
    if (!text || chatBusy) return
    chatBusy = true
    chatHistory = [...chatHistory, { role: "user", content: text }]
    chatInput = ""
    chatStatus = "Thinking…"
    chatStatusColor = "#60a5fa"
    avatar.typing()
    await Promise.resolve()
    if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight
    try {
      const reply = await streamAnthropicSSE(chatHistory.map(m => ({ role: m.role, content: m.content })))
      chatHistory = [...chatHistory, { role: "assistant", content: reply }]
      chatStatus = ""
      avatar.clearState()
      await Promise.resolve()
      if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight
      if (chatTts) {
        try {
          const audio = await fetchTTSAudio(ttsProvider, ttsApiKey, ttsVoice, reply)
          await avatar.talk(audio)
        } catch (e) {
          chatStatus = `TTS error: ${e instanceof Error ? e.message : String(e)}`
          chatStatusColor = "#f87171"
        }
      }
    } catch (err) {
      chatStatus = `Error: ${err instanceof Error ? err.message : String(err)}`
      chatStatusColor = "#f87171"
      avatar.clearState()
    } finally {
      chatBusy = false
    }
  }

  function clearChat() {
    chatHistory = []
    chatStatus = ""
    chatStatusColor = "#555"
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

<hr class="divider">

<div class="tts-panel">
  <span class="group-label tts-label">TTS Demo — speak with AI</span>
  <p class="tts-warning">
    ⚠️ For testing only — paste your key to try TTS directly from the browser.<br>
    Never ship API keys in frontend code. Use a backend proxy in production.
  </p>
  <div class="tts-row">
    <label class="tts-field-label">Provider</label>
    <select value={ttsProvider} on:change={onTtsProviderChange} class="tts-input">
      <option value="openai">OpenAI TTS</option>
      <option value="elevenlabs">ElevenLabs</option>
    </select>
  </div>
  <div class="tts-row">
    <label class="tts-field-label">API Key</label>
    <input type="password" bind:value={ttsApiKey}
      placeholder={ttsProvider === "openai" ? "sk-…" : "Your ElevenLabs API key"}
      class="tts-input" autocomplete="off" />
  </div>
  <div class="tts-row">
    <label class="tts-field-label">Voice</label>
    {#if ttsProvider === "openai"}
      <select bind:value={ttsVoice} class="tts-input">
        {#each ["alloy","echo","fable","nova","onyx","shimmer"] as v}
          <option value={v}>{v}</option>
        {/each}
      </select>
    {:else}
      <input type="text" bind:value={ttsVoice} placeholder="Voice ID (e.g. 21m00Tcm4TlvDq8ikWAM)" class="tts-input" />
    {/if}
  </div>
  <textarea bind:value={ttsText} placeholder="Type something for the avatar to say…" class="tts-textarea"></textarea>
  <button on:click={handleSpeak} disabled={ttsBusy} class="tts-speak-btn">🔊 Speak</button>
  <div class="tts-status" style="color:{ttsStatusColor}">{ttsStatus}</div>
</div>

<hr class="divider" style="max-width:680px; width:100%;" />

<div class="chat-panel">
  <span class="group-label chat-label">Chat Demo — Anthropic Claude</span>
  <div class="tts-row">
    <label class="tts-field-label">API Key</label>
    <input type="password" bind:value={chatApiKey} placeholder="sk-ant-…" class="tts-input" autocomplete="off" />
  </div>
  <div class="tts-row">
    <label class="tts-field-label">Model</label>
    <select bind:value={chatModel} class="tts-input">
      <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
      <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
      <option value="claude-opus-4-7">claude-opus-4-7</option>
    </select>
  </div>
  <div class="tts-row">
    <label class="tts-field-label">System</label>
    <input type="text" bind:value={chatSystem} placeholder="You are a helpful assistant." class="tts-input" />
  </div>
  <div class="tts-row">
    <label class="tts-field-label">TTS</label>
    <label style="display:flex;align-items:center;gap:0.4rem;color:#aaa;font-size:0.72rem;cursor:pointer;">
      <input type="checkbox" bind:checked={chatTts} />
      Read reply aloud (uses TTS Demo provider &amp; key)
    </label>
  </div>
  <div class="chat-messages" bind:this={chatMessagesEl}>
    {#if chatHistory.length === 0}
      <div class="chat-empty">No messages yet — say hello!</div>
    {/if}
    {#each chatHistory as m, i (i)}
      <div class="chat-msg {m.role}">
        <span class="chat-role">{m.role === 'user' ? 'You' : 'Claude'}</span>
        <span class="chat-content">{m.content}</span>
      </div>
    {/each}
  </div>
  <div class="chat-input-row">
    <textarea bind:value={chatInput}
      on:keydown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
      placeholder="Ask something… (Enter to send, Shift+Enter for newline)"
      class="chat-input" disabled={chatBusy} rows="2"></textarea>
    <button on:click={handleChatSend} disabled={chatBusy} class="chat-send-btn">Send</button>
    <button on:click={clearChat} disabled={chatBusy} class="chat-clear-btn">Clear</button>
  </div>
  <div class="chat-status" style="color:{chatStatusColor}">{chatStatus}</div>
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

  .tts-panel {
    display: flex; flex-direction: column; gap: 0.6rem;
    padding: 0.85rem 1rem;
    border: 1px solid rgba(96,165,250,0.25); border-radius: 12px;
    background: rgba(96,165,250,0.04); width: 100%; max-width: 680px;
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

  .chat-panel {
    display: flex; flex-direction: column; gap: 0.6rem;
    padding: 0.85rem 1rem;
    border: 1px solid rgba(167,139,250,0.25); border-radius: 12px;
    background: rgba(167,139,250,0.04); width: 100%; max-width: 680px;
  }
  .chat-label { color: #a78bfa; }
  .chat-messages {
    display: flex; flex-direction: column; gap: 0.5rem;
    max-height: 260px; overflow-y: auto;
    padding: 0.5rem; border: 1px solid rgba(167,139,250,0.15);
    border-radius: 8px; background: rgba(0,0,0,0.15);
  }
  .chat-empty { font-size: 0.72rem; color: #555; text-align: center; padding: 1rem 0; }
  .chat-msg { display: flex; flex-direction: column; gap: 0.15rem; }
  .chat-msg.user { align-items: flex-end; }
  .chat-msg.assistant { align-items: flex-start; }
  .chat-role { font-size: 0.62rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .chat-content {
    font-size: 0.8rem; line-height: 1.45; padding: 0.4rem 0.65rem;
    border-radius: 8px; max-width: 90%; white-space: pre-wrap; word-break: break-word;
  }
  .chat-msg.user .chat-content { background: rgba(167,139,250,0.15); color: #e0d4ff; }
  .chat-msg.assistant .chat-content { background: rgba(96,165,250,0.1); color: #d0e8ff; }
  .chat-input-row { display: flex; gap: 0.4rem; align-items: flex-end; }
  .chat-input {
    flex: 1; padding: 0.4rem 0.6rem; resize: none;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(167,139,250,0.2);
    border-radius: 6px; color: #e0e0ff; font-size: 0.8rem; font-family: inherit;
  }
  .chat-input:disabled { opacity: 0.5; }
  .chat-send-btn {
    border: 1px solid rgba(167,139,250,0.4) !important;
    background: rgba(167,139,250,0.12) !important;
    color: #c4b5fd !important; padding: 0.4rem 0.75rem; font-size: 0.8rem; white-space: nowrap;
  }
  .chat-clear-btn {
    border: 1px solid rgba(255,255,255,0.1) !important;
    background: rgba(255,255,255,0.04) !important;
    color: #666 !important; padding: 0.4rem 0.6rem; font-size: 0.8rem; white-space: nowrap;
  }
  .chat-send-btn:disabled, .chat-clear-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .chat-status { font-size: 0.72rem; font-family: monospace; text-align: center; min-height: 1rem; }
</style>
