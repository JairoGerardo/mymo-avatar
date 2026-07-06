import { useEffect, useState, useCallback } from "react"
import { useAvatar } from "@mymosdk/avatar/react"
import type { AvatarPosition, AvatarFraming, AvatarTheme } from "@mymosdk/avatar"

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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadDemoAudio(): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  // Same CORS rule applies: use a local file or a CORS-enabled CDN URL in production.
  const response = await fetch("/demo_voice_example.mp3")
  const arrayBuffer = await response.arrayBuffer()
  return ctx.decodeAudioData(arrayBuffer)
}

type ThemeMode = "dark" | "light"
type ThemeSlices = typeof THEME_CONFIG

function buildThemeCss(mode: ThemeMode, slices: ThemeSlices) {
  const { color1, color2, shadowOpacity } = slices[mode]
  const ringOpacity = mode === "dark" ? 0.08 : 0.06
  const ringColor   = mode === "dark" ? "255,255,255" : "0,0,0"
  return {
    background: `radial-gradient(circle at 40% 35%, ${color1} 0%, ${color2} 100%)`,
    boxShadow:  `0 8px 32px rgba(0,0,0,${shadowOpacity}), 0 0 0 2px rgba(${ringColor},${ringOpacity})`,
  }
}

// ── TTS helpers ───────────────────────────────────────────────────────────────

const ELEVENLABS_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"

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

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "linear-gradient(135deg,#0f0f23 0%,#1a1a3e 50%,#0d1117 100%)",
    minHeight: "100vh",
    color: "#e0e0ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    padding: "2rem",
  },
  h1: {
    fontSize: "2rem",
    fontWeight: 700,
    background: "linear-gradient(135deg,#a78bfa,#60a5fa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  subtitle:   { fontSize: "0.9rem", color: "#888", marginTop: "-1rem" },
  controls:   { display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", width: "100%", maxWidth: 680 },
  group:      { display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center", width: "100%" },
  groupLabel: { fontSize: "0.65rem", textTransform: "uppercase" as const, letterSpacing: 1, color: "#666" },
  btnRow:     { display: "flex", gap: "0.4rem", flexWrap: "wrap" as const, justifyContent: "center" },
  btn: {
    padding: "0.45rem 0.9rem",
    border: "1px solid rgba(167,139,250,0.3)",
    borderRadius: 8,
    background: "rgba(167,139,250,0.08)",
    color: "#c4b5fd",
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  btnActive: {
    padding: "0.45rem 0.9rem",
    border: "1px solid rgba(167,139,250,0.9)",
    borderRadius: 8,
    background: "rgba(167,139,250,0.3)",
    color: "#fff",
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  divider:    { width: "100%", border: "none", borderTop: "1px solid rgba(167,139,250,0.1)" },
  inlineRow:  { display: "flex", gap: "1.5rem", flexWrap: "wrap" as const, justifyContent: "center", width: "100%" },
  configPanel:{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", width: "100%" },
  configBox:  { display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.75rem", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 10, background: "rgba(167,139,250,0.04)" },
  sliderRow:  { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#aaa", width: "100%" },
  sliderLabel:{ minWidth: "4rem", textAlign: "right" as const, color: "#888" },
  sliderVal:  { minWidth: "2.5rem", fontFamily: "monospace", color: "#c4b5fd" },
  colorRow:   { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#888" },
  colorInput: { width: "2.2rem", height: "1.5rem", cursor: "pointer", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 4, background: "none", padding: 1 },
}

const sChat: Record<string, React.CSSProperties> = {
  panel:    { display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.85rem 1rem", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12, background: "rgba(167,139,250,0.04)", width: "100%" },
  messages: { display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 180, overflowY: "auto" as const, padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: "0.78rem", lineHeight: 1.5 },
  inputRow: { display: "flex", gap: "0.5rem", alignItems: "flex-end", width: "100%" },
  input:    { flex: 1, padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, color: "#e0e0ff", fontSize: "0.82rem", resize: "vertical" as const, minHeight: 38, fontFamily: "inherit" },
  sendBtn:  { padding: "0.4rem 0.8rem", border: "1px solid rgba(167,139,250,0.4)", borderRadius: 8, background: "rgba(167,139,250,0.1)", color: "#c4b5fd", fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" as const },
  clearBtn: { padding: "0.25rem 0.55rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, background: "transparent", color: "#555", fontSize: "0.7rem", cursor: "pointer" },
  checkRow: { display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#888", cursor: "pointer" },
}

const sTTS: Record<string, React.CSSProperties> = {
  panel:    { display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.85rem 1rem", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 12, background: "rgba(96,165,250,0.04)", width: "100%" },
  warning:  { fontSize: "0.68rem", color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "0.4rem 0.6rem", textAlign: "center" as const, lineHeight: 1.4 },
  row:      { display: "flex", gap: "0.5rem", alignItems: "center", width: "100%", flexWrap: "wrap" as const },
  label:    { fontSize: "0.72rem", color: "#888", minWidth: "4.5rem", textAlign: "right" as const },
  input:    { flex: 1, minWidth: 0, padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, color: "#e0e0ff", fontSize: "0.78rem" },
  textarea: { width: "100%", padding: "0.45rem 0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, color: "#e0e0ff", fontSize: "0.82rem", resize: "vertical" as const, minHeight: 56, fontFamily: "inherit" },
  speakBtn: { border: "1px solid rgba(96,165,250,0.4)", background: "rgba(96,165,250,0.1)", color: "#93c5fd", width: "100%", fontSize: "0.85rem", padding: "0.55rem", borderRadius: 8, cursor: "pointer" },
}

const FRAMINGS: AvatarFraming[] = ["full", "half", "bust", "face"]
const THEMES: AvatarTheme[]     = ["light", "dark", "transparent"]
const THEME_LABELS: Record<AvatarTheme, string> = { light: "☀️ light", dark: "🌙 dark", transparent: "◻️ transparent" }

// ── Component ─────────────────────────────────────────────────────────────────

export function App() {
  const avatarRef = useAvatar({
    // Replace with any GLB/VRM URL hosted on a CORS-enabled CDN (e.g. Cloudflare R2,
    // GitHub Pages, or your own server). GitHub Releases URLs don't support CORS.
    // model: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
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

  const [log, setLog]               = useState("Initializing…")
  const [logActive, setLogActive]   = useState(false)
  const [talking, setTalking]       = useState(false)
  const [activeFraming, setActiveFraming] = useState<AvatarFraming>(INITIAL_FRAMING)
  const [activeTheme, setActiveTheme]     = useState<AvatarTheme>(INITIAL_THEME)
  const [themeMode, setThemeMode]   = useState<ThemeMode>("dark")
  const [slices, setSlices]         = useState({ ...FRAMING_CONFIG })
  const [themeSlices, setThemeSlices] = useState<ThemeSlices>({ ...THEME_CONFIG })
  const [avatarSize, setAvatarSize]   = useState(400)
  const [ttsProvider, setTtsProvider] = useState("openai")
  const [ttsApiKey, setTtsApiKey]     = useState("")
  const [ttsVoice, setTtsVoice]       = useState("nova")
  const [ttsText, setTtsText]         = useState("Hello! I'm your Mymo avatar. How can I help you today?")
  const [ttsBusy, setTtsBusy]         = useState(false)
  const [ttsStatus, setTtsStatus]     = useState("")
  const [ttsStatusColor, setTtsStatusColor] = useState("#555")

  type ChatMsg = { role: "user" | "assistant"; content: string }
  const [chatHistory, setChatHistory]     = useState<ChatMsg[]>([])
  const [chatApiKey, setChatApiKey]       = useState("")
  const [chatModel, setChatModel]         = useState("claude-sonnet-4-6")
  const [chatSystem, setChatSystem]       = useState("You are a helpful avatar assistant. Keep replies short and friendly.")
  const [chatTts, setChatTts]             = useState(false)
  const [chatInput, setChatInput]         = useState("")
  const [chatBusy, setChatBusy]           = useState(false)
  const [chatStatus, setChatStatus]       = useState("")
  const [chatStatusColor, setChatStatusColor] = useState("#555")

  const flash = useCallback((msg: string) => {
    setLog(msg)
    setLogActive(true)
    setTimeout(() => setLogActive(false), 2000)
  }, [])

  useEffect(() => {
    const a = avatarRef.current
    if (!a) return
    a.on("loaded",         ()                      => flash("Avatar loaded ✓"))
    a.on("modelLoaded",    ()                      => flash("Model ready ✓"))
    a.on("click",          ()                      => { a.wave(); flash("avatar.wave()") })
    a.on("animationStart", (_: string, d: unknown) => flash(`animationStart: ${JSON.stringify(d)}`))
    a.on("speechStart",    ()                      => { setLog("speechStart — talking…"); setLogActive(false); setTalking(true) })
    a.on("speechEnd",      ()                      => { flash("speechEnd ✓"); setTalking(false) })
  }, [flash]) // eslint-disable-line react-hooks/exhaustive-deps

  const av = () => avatarRef.current!

  function act(label: string, fn: () => void) {
    flash(`avatar.${label}()`)
    fn()
  }

  function selectFraming(mode: AvatarFraming) {
    setActiveFraming(mode)
    av().frame(mode)
    flash(`avatar.frame("${mode}")`)
  }

  function selectTheme(theme: AvatarTheme) {
    setActiveTheme(theme)
    if (theme !== "transparent") setThemeMode(theme)
    av().setTheme(theme)
    flash(`avatar.setTheme("${theme}")`)
  }

  function updateSlice(mode: AvatarFraming, key: "from" | "lookBias", value: number) {
    setSlices(prev => {
      const next = { ...prev, [mode]: { ...prev[mode], [key]: value } }
      avatarRef.current?.setFramingConfig({ [mode]: next[mode] })
      flash(`framingConfig.${mode}.${key} = ${value.toFixed(2)}`)
      return next
    })
  }

  function updateThemeSlice(mode: ThemeMode, key: keyof ThemeSlices[ThemeMode], value: string | number) {
    setThemeSlices(prev => {
      const next = { ...prev, [mode]: { ...prev[mode], [key]: value } } as ThemeSlices
      avatarRef.current?.setThemeConfig({ [mode]: buildThemeCss(mode, next) })
      flash(`themeConfig.${mode}.${key} updated`)
      return next
    })
  }

  function updateSize(px: number) {
    setAvatarSize(px)
    av().size(px)
    flash(`avatar.size(${px})`)
  }

  async function streamAnthropicSSE(messages: Array<{role: string; content: string}>): Promise<string> {
    if (!chatApiKey.trim()) throw new Error("Paste your Anthropic API key first")
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": chatApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: chatModel, max_tokens: 1024, system: chatSystem || undefined, messages, stream: true }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Anthropic error ${res.status}`)
    }
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
        try {
          const j = JSON.parse(line.slice(6)) as { type?: string; delta?: { type?: string; text?: string } }
          if (j.type === "content_block_delta" && j.delta?.type === "text_delta") fullText += j.delta.text ?? ""
        } catch { /* skip */ }
      }
    }
    return fullText
  }

  async function handleSend() {
    const text = chatInput.trim()
    if (!text || chatBusy) return
    const newHistory = [...chatHistory, { role: "user" as const, content: text }]
    setChatHistory(newHistory)
    setChatInput("")
    setChatBusy(true)
    setChatStatus("Claude is thinking…")
    setChatStatusColor("#a78bfa")
    av().setState("typing")
    try {
      const reply = await streamAnthropicSSE(newHistory)
      const updated = [...newHistory, { role: "assistant" as const, content: reply }]
      setChatHistory(updated)
      av().clearState()
      setChatStatus("")
      if (chatTts && reply) {
        av().setState("processing")
        setChatStatus("Speaking…")
        setChatStatusColor("#60a5fa")
        try { const audio = await fetchTTSAudio(ttsProvider, ttsApiKey, ttsVoice, reply); await av().talk(audio) } catch { /* non-fatal */ }
        av().clearState()
        setChatStatus("")
      }
    } catch (err) {
      av().clearState()
      setChatStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setChatStatusColor("#f87171")
    } finally {
      setChatBusy(false)
    }
  }

  async function handleSpeak() {
    const text = ttsText.trim()
    if (!text) return
    setTtsBusy(true)
    setTtsStatus("Generating audio…")
    setTtsStatusColor("#60a5fa")
    try {
      const audio = await fetchTTSAudio(ttsProvider, ttsApiKey, ttsVoice, text)
      setTtsStatus("Playing…")
      await av().talk(audio)
      setTtsStatus("Done ✓")
      setTtsStatusColor("#a78bfa")
      setTimeout(() => setTtsStatus(""), 2000)
    } catch (err) {
      setTtsStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setTtsStatusColor("#f87171")
    } finally {
      setTtsBusy(false)
    }
  }

  const cfg      = slices[activeFraming]
  const themeCfg = themeSlices[themeMode]

  function group(label: string, children: React.ReactNode, style?: React.CSSProperties) {
    return (
      <div style={{ ...S.group, width: "auto", ...style }}>
        <span style={S.groupLabel}>{label}</span>
        <div style={S.btnRow}>{children}</div>
      </div>
    )
  }

  function btn(label: string, fn: () => void, display?: string) {
    return <button key={label} style={S.btn} onClick={() => act(label, fn)}>{display ?? label}</button>
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Mymo Avatar — React</h1>
      <p style={S.subtitle}>SDK Demo — lightweight animated avatar</p>

      <div style={S.controls}>

        {/* Expressions */}
        <div style={{ ...S.group }}>
          <span style={S.groupLabel}>Expressions</span>
          <div style={S.btnRow}>
            {btn("smile",     () => av().smile(),     "😊 smile")}
            {btn("happy",     () => av().happy(),     "😄 happy")}
            {btn("sad",       () => av().sad(),       "😢 sad")}
            {btn("angry",     () => av().angry(),     "😠 angry")}
            {btn("surprised", () => av().surprised(), "😲 surprised")}
            {btn("thinking",  () => av().thinking(),  "🤔 thinking")}
            {btn("confused",  () => av().confused(),  "😕 confused")}
            {btn("sleep",     () => av().sleep(),     "😴 sleep")}
            {btn("idle",      () => av().idle(),      "😐 idle")}
          </div>
        </div>

        <hr style={S.divider} />

        {/* Gestures */}
        <div style={S.group}>
          <span style={S.groupLabel}>Gestures</span>
          <div style={S.btnRow}>
            {btn("wave",      () => av().wave(),      "👋 wave")}
            {btn("nod",       () => av().nod(),       "↕️ nod")}
            {btn("yes",       () => av().yes(),       "✅ yes")}
            {btn("no",        () => av().no(),        "❌ no")}
            {btn("shakeHead", () => av().shakeHead(), "🙅 shakeHead")}
            {btn("clap",      () => av().clap(),      "👏 clap")}
            {btn("jump",      () => av().jump(),      "⬆️ jump")}
            {btn("dance",     () => av().dance(),     "💃 dance")}
            {btn("thumbsUp",  () => av().thumbsUp(),  "👍 thumbsUp")}
          </div>
        </div>

        <hr style={S.divider} />

        {/* States */}
        <div style={S.group}>
          <span style={S.groupLabel}>States</span>
          <div style={S.btnRow}>
            {btn("loading",    () => av().loading(),    "⏳ loading")}
            {btn("success",    () => av().success(),    "✅ success")}
            {btn("error",      () => av().error(),      "❌ error")}
            {btn("warning",    () => av().warning(),    "⚠️ warning")}
            {btn("listening",  () => av().listening(),  "👂 listening")}
            {btn("typing",     () => av().typing(),     "⌨️ typing")}
            {btn("processing", () => av().processing(), "⚙️ processing")}
            {btn("complete",   () => av().complete(),   "🏁 complete")}
            {btn("clearState", () => av().clearState(), "✖ clear")}
          </div>
        </div>

        <hr style={S.divider} />

        {/* Look · Speech · Position */}
        <div style={S.inlineRow}>
          {group("Look", <>
            {btn("lookAtMouse", () => av().lookAtMouse(), "👁️ follow mouse")}
            {btn("lookForward", () => av().lookForward(), "⬛ look forward")}
            {btn("randomLook",  () => av().randomLook(),  "🔀 random look")}
          </>)}
          {group("Speech", <>
            {btn("talk",        () => loadDemoAudio().then(buf => av().talk(buf)).catch(console.error), "🗣️ talk")}
            {btn("stopTalking", () => av().stopTalking(), "🔇 stop")}
          </>)}
          {group("Position", <>
            {btn("bottom-right", () => av().position("bottom-right" as AvatarPosition), "↘ bottom-right")}
            {btn("bottom-left",  () => av().position("bottom-left"  as AvatarPosition), "↙ bottom-left")}
            {btn("top-right",    () => av().position("top-right"    as AvatarPosition), "↗ top-right")}
            {btn("top-left",     () => av().position("top-left"     as AvatarPosition), "↖ top-left")}
          </>)}
        </div>

        <hr style={S.divider} />

        {/* Size */}
        <div style={S.group}>
          <span style={S.groupLabel}>Size</span>
          <div style={{ ...S.sliderRow, maxWidth: 340, width: "100%" }}>
            <label style={S.sliderLabel}>px</label>
            <input type="range" min={80} max={600} step={10} value={avatarSize}
              style={{ flex: 1, accentColor: "#a78bfa" }}
              onChange={e => updateSize(parseInt(e.target.value, 10))} />
            <span style={S.sliderVal}>{avatarSize}</span>
          </div>
        </div>

        <hr style={S.divider} />

        {/* Framing + Theme config panel */}
        <div style={S.configPanel}>

          {/* Framing */}
          <div style={S.configBox}>
            <span style={{ ...S.groupLabel, alignSelf: "center" }}>Framing — {activeFraming}</span>
            <div style={S.btnRow}>
              {FRAMINGS.map(m => (
                <button key={m} style={activeFraming === m ? S.btnActive : S.btn} onClick={() => selectFraming(m)}>{m}</button>
              ))}
            </div>
            <div style={S.sliderRow}>
              <label style={S.sliderLabel}>from</label>
              <input type="range" min={0} max={1} step={0.01} value={cfg.from}
                style={{ flex: 1, accentColor: "#a78bfa" }}
                onChange={e => updateSlice(activeFraming, "from", parseFloat(e.target.value))} />
              <span style={S.sliderVal}>{cfg.from.toFixed(2)}</span>
            </div>
            <div style={S.sliderRow}>
              <label style={S.sliderLabel}>lookBias</label>
              <input type="range" min={0} max={1} step={0.01} value={cfg.lookBias}
                style={{ flex: 1, accentColor: "#a78bfa" }}
                onChange={e => updateSlice(activeFraming, "lookBias", parseFloat(e.target.value))} />
              <span style={S.sliderVal}>{cfg.lookBias.toFixed(2)}</span>
            </div>
          </div>

          {/* Theme */}
          <div style={S.configBox}>
            <span style={{ ...S.groupLabel, alignSelf: "center" }}>Theme</span>
            <div style={S.btnRow}>
              {THEMES.map(t => (
                <button key={t} style={activeTheme === t ? S.btnActive : S.btn} onClick={() => selectTheme(t)}>{THEME_LABELS[t]}</button>
              ))}
            </div>
            {activeTheme !== "transparent" && <>
              <div style={S.colorRow}>
                <label>center</label>
                <input type="color" value={themeCfg.color1} style={S.colorInput}
                  onChange={e => updateThemeSlice(themeMode, "color1", e.target.value)} />
                <label>edge</label>
                <input type="color" value={themeCfg.color2} style={S.colorInput}
                  onChange={e => updateThemeSlice(themeMode, "color2", e.target.value)} />
              </div>
              <div style={S.sliderRow}>
                <label style={S.sliderLabel}>shadow</label>
                <input type="range" min={0} max={1} step={0.05} value={themeCfg.shadowOpacity}
                  style={{ flex: 1, accentColor: "#a78bfa" }}
                  onChange={e => updateThemeSlice(themeMode, "shadowOpacity", parseFloat(e.target.value))} />
                <span style={S.sliderVal}>{themeCfg.shadowOpacity.toFixed(2)}</span>
              </div>
            </>}
          </div>

        </div>

        <hr style={S.divider} />

        {/* TTS Demo */}
        <div style={sTTS.panel}>
          <span style={{ ...S.groupLabel, color: "#60a5fa" }}>TTS Demo — speak with AI</span>
          <p style={sTTS.warning}>
            ⚠️ For testing only — paste your key to try TTS directly from the browser.<br />
            Never ship API keys in frontend code. Use a backend proxy in production.
          </p>
          <div style={sTTS.row}>
            <label style={sTTS.label}>Provider</label>
            <select value={ttsProvider} onChange={e => { setTtsProvider(e.target.value); setTtsVoice(e.target.value === "openai" ? "nova" : "") }} style={sTTS.input}>
              <option value="openai">OpenAI TTS</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>
          <div style={sTTS.row}>
            <label style={sTTS.label}>API Key</label>
            <input type="password" value={ttsApiKey} onChange={e => setTtsApiKey(e.target.value)}
              placeholder={ttsProvider === "openai" ? "sk-…" : "Your ElevenLabs API key"}
              style={sTTS.input} autoComplete="off" />
          </div>
          <div style={sTTS.row}>
            <label style={sTTS.label}>Voice</label>
            {ttsProvider === "openai"
              ? <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)} style={sTTS.input}>
                  {["alloy","echo","fable","nova","onyx","shimmer"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              : <input type="text" value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}
                  placeholder="Voice ID (e.g. 21m00Tcm4TlvDq8ikWAM)" style={sTTS.input} />
            }
          </div>
          <textarea value={ttsText} onChange={e => setTtsText(e.target.value)}
            placeholder="Type something for the avatar to say…" style={sTTS.textarea} />
          <button onClick={handleSpeak} disabled={ttsBusy} style={sTTS.speakBtn}>🔊 Speak</button>
          <div style={{ fontSize: "0.72rem", fontFamily: "monospace", textAlign: "center", minHeight: "1rem", color: ttsStatusColor }}>{ttsStatus}</div>
        </div>

        <hr style={S.divider} />

        {/* Chat Demo */}
        <div style={sChat.panel}>
          <span style={{ ...S.groupLabel, color: "#a78bfa" }}>Chat Demo — Anthropic Claude</span>
          <p style={sTTS.warning}>
            ⚠️ For testing only — paste your key to try Claude directly from the browser.<br />
            Never ship API keys in frontend code. Use a backend proxy in production.
          </p>
          <div style={sTTS.row}>
            <label style={sTTS.label}>API Key</label>
            <input type="password" value={chatApiKey} onChange={e => setChatApiKey(e.target.value)}
              placeholder="sk-ant-…" style={sTTS.input} autoComplete="off" />
          </div>
          <div style={sTTS.row}>
            <label style={sTTS.label}>Model</label>
            <select value={chatModel} onChange={e => setChatModel(e.target.value)} style={sTTS.input}>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
              <option value="claude-opus-4-7">claude-opus-4-7</option>
            </select>
          </div>
          <div style={sTTS.row}>
            <label style={sTTS.label}>System</label>
            <input type="text" value={chatSystem} onChange={e => setChatSystem(e.target.value)}
              placeholder="You are a helpful avatar assistant." style={sTTS.input} />
          </div>
          <label style={sChat.checkRow}>
            <input type="checkbox" checked={chatTts} onChange={e => setChatTts(e.target.checked)} />
            Speak response via TTS (uses provider + key from TTS Demo above)
          </label>
          <div style={sChat.messages}>
            {chatHistory.length === 0
              ? <span style={{ color: "#555", fontSize: "0.72rem", alignSelf: "center" }}>Start the conversation below</span>
              : chatHistory.map((m, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                    <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: 1, color: m.role === "user" ? "#60a5fa" : "#a78bfa" }}>{m.role}</span>
                    <span style={{ color: "#e0e0ff" }}>{m.content}</span>
                  </div>
                ))
            }
          </div>
          <div style={sChat.inputRow}>
            <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
              placeholder="Type your message…" rows={1} style={sChat.input} />
            <button onClick={() => void handleSend()} disabled={chatBusy} style={sChat.sendBtn}>Send ↵</button>
            <button onClick={() => { setChatHistory([]); setChatStatus("") }} style={sChat.clearBtn}>clear</button>
          </div>
          <div style={{ fontSize: "0.72rem", fontFamily: "monospace", textAlign: "center", minHeight: "1rem", color: chatStatusColor }}>{chatStatus}</div>
        </div>

      </div>

      {talking && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: 260 }}>
          <span style={{ fontSize: "0.7rem", color: "#a78bfa" }}>🎙️ talking</span>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg,#a78bfa,#60a5fa)", borderRadius: 3 }} />
          </div>
        </div>
      )}

      <div style={{ fontSize: "0.75rem", color: logActive ? "#a78bfa" : "#555", fontFamily: "monospace", height: "1.2rem", transition: "color 0.3s" }}>
        {log}
      </div>
    </div>
  )
}
