import { useEffect, useState, useCallback } from "react"
import { useAvatar } from "@mymo/react"
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const FRAMINGS: AvatarFraming[] = ["full", "half", "bust", "face"]
const THEMES: AvatarTheme[]     = ["light", "dark", "transparent"]

// ── Component ─────────────────────────────────────────────────────────────────

export function App() {
  const avatarRef = useAvatar({
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

  function btn(label: string, fn: () => void) {
    return <button key={label} style={S.btn} onClick={() => act(label, fn)}>{label}</button>
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
            {btn("smile",     () => av().smile())}
            {btn("happy",     () => av().happy())}
            {btn("sad",       () => av().sad())}
            {btn("angry",     () => av().angry())}
            {btn("surprised", () => av().surprised())}
            {btn("thinking",  () => av().thinking())}
            {btn("confused",  () => av().confused())}
            {btn("sleep",     () => av().sleep())}
            {btn("idle",      () => av().idle())}
          </div>
        </div>

        <hr style={S.divider} />

        {/* Gestures */}
        <div style={S.group}>
          <span style={S.groupLabel}>Gestures</span>
          <div style={S.btnRow}>
            {btn("wave",      () => av().wave())}
            {btn("nod",       () => av().nod())}
            {btn("yes",       () => av().yes())}
            {btn("no",        () => av().no())}
            {btn("shakeHead", () => av().shakeHead())}
            {btn("clap",      () => av().clap())}
            {btn("jump",      () => av().jump())}
            {btn("dance",     () => av().dance())}
            {btn("thumbsUp",  () => av().thumbsUp())}
          </div>
        </div>

        <hr style={S.divider} />

        {/* States */}
        <div style={S.group}>
          <span style={S.groupLabel}>States</span>
          <div style={S.btnRow}>
            {btn("loading",    () => av().loading())}
            {btn("success",    () => av().success())}
            {btn("error",      () => av().error())}
            {btn("warning",    () => av().warning())}
            {btn("listening",  () => av().listening())}
            {btn("typing",     () => av().typing())}
            {btn("processing", () => av().processing())}
            {btn("complete",   () => av().complete())}
            {btn("clearState", () => av().clearState())}
          </div>
        </div>

        <hr style={S.divider} />

        {/* Look · Speech · Position */}
        <div style={S.inlineRow}>
          {group("Look", <>
            {btn("lookAtMouse", () => av().lookAtMouse())}
            {btn("lookForward", () => av().lookForward())}
            {btn("randomLook",  () => av().randomLook())}
          </>)}
          {group("Speech", <>
            {btn("talk",        () => av().talk(createSpeechTone(3)).catch(console.error))}
            {btn("stopTalking", () => av().stopTalking())}
          </>)}
          {group("Position", <>
            {btn("bottom-right", () => av().position("bottom-right" as AvatarPosition))}
            {btn("bottom-left",  () => av().position("bottom-left"  as AvatarPosition))}
            {btn("top-right",    () => av().position("top-right"    as AvatarPosition))}
            {btn("top-left",     () => av().position("top-left"     as AvatarPosition))}
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
                <button key={t} style={activeTheme === t ? S.btnActive : S.btn} onClick={() => selectTheme(t)}>{t}</button>
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
