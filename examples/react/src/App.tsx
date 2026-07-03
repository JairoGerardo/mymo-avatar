import { useEffect, useState, useCallback } from "react"
import { useAvatar } from "@mymo/react"
import type { AvatarPosition, AvatarFraming } from "@mymo/avatar"

const INIT_FRAMING = {
  full: { from: 0.00, lookBias: 0.50 },
  half: { from: 0.50, lookBias: 0.55 },
  bust: { from: 0.60, lookBias: 0.62 },
  face: { from: 0.72, lookBias: 0.65 },
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
    gap: "2rem",
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
  subtitle: { fontSize: "0.9rem", color: "#888", marginTop: "-1.5rem" },
  controls: { display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", maxWidth: 600 },
  group: { display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" },
  groupLabel: { fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: 1, color: "#666" },
  btnRow: { display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center" },
  btn: {
    padding: "0.45rem 0.9rem",
    border: "1px solid rgba(167,139,250,0.3)",
    borderRadius: 8,
    background: "rgba(167,139,250,0.08)",
    color: "#c4b5fd",
    fontSize: "0.8rem",
    cursor: "pointer",
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
  sliderRow: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#aaa", width: "100%" },
  sliderLabel: { minWidth: "4.5rem", textAlign: "right", color: "#888" },
  sliderVal: { minWidth: "2.5rem", fontFamily: "monospace", color: "#c4b5fd" },
}

const FRAMINGS: AvatarFraming[] = ["full", "half", "bust", "face"]

export function App() {
  const avatarRef = useAvatar({
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
    framingConfig: INIT_FRAMING,
  })

  const [log, setLog] = useState("Initializing…")
  const [logActive, setLogActive] = useState(false)
  const [talking, setTalking] = useState(false)
  const [activeFraming, setActiveFraming] = useState<AvatarFraming>("full")
  const [slices, setSlices] = useState({ ...INIT_FRAMING })

  const flash = useCallback((msg: string) => {
    setLog(msg)
    setLogActive(true)
    setTimeout(() => setLogActive(false), 2000)
  }, [])

  useEffect(() => {
    const a = avatarRef.current
    if (!a) return
    a.on("loaded",         ()                       => flash("Avatar loaded ✓"))
    a.on("modelLoaded",    ()                       => flash("Model ready ✓"))
    a.on("click",          ()                       => { a.wave(); flash("avatar.wave()") })
    a.on("animationStart", (_: string, d: unknown)  => flash(`animationStart: ${JSON.stringify(d)}`))
    a.on("speechStart",    ()                       => { setLog("speechStart — talking…"); setLogActive(false); setTalking(true) })
    a.on("speechEnd",      ()                       => { flash("speechEnd ✓"); setTalking(false) })
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

  function updateSlice(mode: AvatarFraming, key: "from" | "lookBias", value: number) {
    setSlices(prev => {
      const next = { ...prev, [mode]: { ...prev[mode], [key]: value } }
      avatarRef.current?.setFramingConfig({ [mode]: next[mode] })
      flash(`framingConfig.${mode}.${key} = ${value.toFixed(2)}`)
      return next
    })
  }

  const cfg = slices[activeFraming]

  function group(label: string, children: React.ReactNode) {
    return (
      <div style={S.group}>
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
        {group("Expressions", <>
          {btn("smile",     () => av().smile())}
          {btn("happy",     () => av().happy())}
          {btn("sad",       () => av().sad())}
          {btn("angry",     () => av().angry())}
          {btn("surprised", () => av().surprised())}
          {btn("thinking",  () => av().thinking())}
          {btn("confused",  () => av().confused())}
          {btn("sleep",     () => av().sleep())}
          {btn("idle",      () => av().idle())}
        </>)}

        {group("Gestures", <>
          {btn("wave",      () => av().wave())}
          {btn("nod",       () => av().nod())}
          {btn("yes",       () => av().yes())}
          {btn("no",        () => av().no())}
          {btn("shakeHead", () => av().shakeHead())}
          {btn("clap",      () => av().clap())}
          {btn("jump",      () => av().jump())}
          {btn("dance",     () => av().dance())}
        </>)}

        {group("States", <>
          {btn("loading",    () => av().loading())}
          {btn("success",    () => av().success())}
          {btn("error",      () => av().error())}
          {btn("warning",    () => av().warning())}
          {btn("listening",  () => av().listening())}
          {btn("typing",     () => av().typing())}
          {btn("processing", () => av().processing())}
          {btn("complete",   () => av().complete())}
          {btn("clearState", () => av().clearState())}
        </>)}

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

        {group("Framing",
          FRAMINGS.map(m => (
            <button key={m} style={activeFraming === m ? S.btnActive : S.btn} onClick={() => selectFraming(m)}>{m}</button>
          ))
        )}

        <div style={{ ...S.group, width: "100%", maxWidth: 340 }}>
          <span style={S.groupLabel}>Framing Config — {activeFraming}</span>
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
