import { useRef, useState } from "react"
import { AvatarWidget } from "@mymo/react"
import type { Avatar } from "@mymo/avatar"

const ROBOT_GLB =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb"

export function App() {
  const avatarRef = useRef<Avatar | null>(null)
  const [log, setLog] = useState("Initializing…")

  function act(label: string, fn: (a: Avatar) => void) {
    setLog(label)
    if (avatarRef.current) fn(avatarRef.current)
  }

  const btn = (label: string, fn: (a: Avatar) => void) => (
    <button onClick={() => act(label, fn)}>{label}</button>
  )

  return (
    <>
      <AvatarWidget
        ref={avatarRef}
        model={ROBOT_GLB}
        position="bottom-right"
        size={200}
        theme="dark"
        idle
        blink
        draggable
      />
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
        <h1 style={{ fontSize: "2rem", background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Mymo Avatar — React
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", maxWidth: 480 }}>
          {btn("smile",      a => a.smile())}
          {btn("sad",        a => a.sad())}
          {btn("wave",       a => a.wave())}
          {btn("nod",        a => a.nod())}
          {btn("loading",    a => a.loading())}
          {btn("success",    a => a.success())}
          {btn("error",      a => a.error())}
          {btn("listening",  a => a.listening())}
          {btn("clearState", a => a.clearState())}
          {btn("lookAtMouse",a => a.lookAtMouse())}
          {btn("lookForward",a => a.lookForward())}
        </div>
        <p style={{ fontSize: "0.8rem", color: "#a78bfa", fontFamily: "monospace" }}>{log}</p>
      </div>
    </>
  )
}
