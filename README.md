# mymo-avatar

Lightweight animated 3D avatar SDK for any web application.

- **23 KB gzip** (core, Three.js not included)
- **60 FPS** WebGL rendering via Three.js
- **Framework-agnostic** — Vanilla, React, Vue, Next.js, Nuxt, Svelte, Electron
- **AI-agnostic** — works standalone or with any LLM/TTS provider
- **< 5 min** to integrate

## How it works

The SDK renders an animated 3D avatar as a fixed floating widget that mounts itself directly to `document.body`. You create one `Avatar` instance and control everything through its chainable API — no framework bindings required unless you want them.

Under the hood, six systems work together:

| System | Responsibility |
|---|---|
| **Renderer** | Three.js WebGL scene with ambient + key + fill lighting, ACES Filmic tone mapping, optional shadows |
| **Animation Engine** | Procedural bone rotations for gestures + morph target blending for expressions |
| **Audio Engine** | Web Audio API wrapper — playback, amplitude analysis, gain control |
| **Lip Sync** | Amplitude-to-viseme mapping; drives mouth morphs in real time |
| **Asset Loader** | GLB/VRM loading from CDN or any URL; in-memory model cache |
| **Plugin System** | `avatar.use(plugin)` registers third-party or custom integrations |

The avatar widget is a rounded `<div>` containing a `<canvas>`. The widget can be dragged, repositioned, resized, and themed at runtime without recreating it.

---

## Installation

```bash
# npm
npm install @mymo/avatar three

# pnpm
pnpm add @mymo/avatar three

# yarn
yarn add @mymo/avatar three
```

> Three.js is a peer dependency. If you already have it in your project, you only need `@mymo/avatar`.

---

## Quickstart

```ts
import { Avatar } from "@mymo/avatar"

const avatar = new Avatar({
  model: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
  position: "bottom-right",
  size: 200,
  theme: "dark",
  framing: "bust",
})
```

The avatar mounts itself to `document.body` as a fixed floating widget immediately.

---

## API

### Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `"maya"` | Model name (CDN-resolved) or a GLB/VRM URL |
| `position` | `AvatarPosition` | `"bottom-right"` | Corner preset |
| `size` | `number` | `180` | Widget size in px |
| `theme` | `AvatarTheme` | `"light"` | Background theme |
| `themeConfig` | `ThemeConfig` | `{}` | Custom background/shadow per theme |
| `framing` | `AvatarFraming` | `"full"` | Camera framing preset |
| `framingConfig` | `FramingSliceConfig` | `{}` | Per-mode framing fine-tuning |
| `draggable` | `boolean` | `false` | Allow drag & drop repositioning |
| `shadows` | `boolean` | `false` | Enable shadow rendering |
| `idle` | `boolean` | `true` | Enable idle micro-expression animations |
| `idleInterval` | `number` | `8000` | Idle animation interval (ms) |
| `blink` | `boolean` | `true` | Enable auto-blink |
| `blinkInterval` | `number` | `3500` | Blink interval (ms) |
| `lipSync` | `boolean` | `true` | Enable audio-driven lip sync |
| `followMouse` | `boolean` | `false` | Auto-track mouse cursor |
| `autoHide` | `boolean` | `false` | Hide widget when user scrolls |
| `zIndex` | `number` | `99999` | CSS z-index of the widget |

---

### Framing

Control how much of the model is visible in the widget:

```ts
avatar.frame("full")   // entire body
avatar.frame("half")   // waist up
avatar.frame("bust")   // chest up
avatar.frame("face")   // head only
```

Fine-tune each mode at runtime:

```ts
avatar.setFramingConfig({
  bust: { from: 0.70, to: 1.0, lookBias: 0.44 },
  face: { from: 0.82, to: 1.0, lookBias: 0.34 },
})
```

| Field | Type | Description |
|---|---|---|
| `from` | `number` | Bottom of visible slice (0–1) |
| `to` | `number` | Top of visible slice (0–1, usually 1.0) |
| `lookBias` | `number` | Where the camera aims in the slice (0.5 = center; lower = more headroom) |

Default slices:

| Mode | `from` | `to` | `lookBias` |
|---|---|---|---|
| `full` | 0.00 | 1.00 | 0.50 |
| `half` | 0.48 | 1.00 | 0.50 |
| `bust` | 0.68 | 1.00 | 0.46 |
| `face` | 0.80 | 1.00 | 0.36 |

---

### Theme

Switch theme at runtime or customize colors and shadows:

```ts
avatar.setTheme("dark")

avatar.setThemeConfig({
  light: {
    background: "radial-gradient(circle at 60% 40%, #ffffff, #e8e8e8)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
  },
  dark: {
    background: "radial-gradient(circle at 60% 40%, #2a2a2a, #1a1a1a)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
})
```

`ThemeConfig` is `Partial<Record<"light" | "dark", { background?: string; boxShadow?: string }>>`.

---

### Expressions

```ts
avatar.smile()
avatar.sad()
avatar.happy()
avatar.angry()
avatar.surprised()
avatar.thinking()
avatar.confused()
avatar.sleep()
avatar.idle()            // reset to neutral

// With explicit intensity (0–1)
avatar.expression("smile", 0.8)
```

---

### Gestures

```ts
avatar.wave()
avatar.nod()
avatar.yes()             // affirmative nods (larger amplitude)
avatar.no()              // deliberate side-to-side shakes
avatar.shakeHead()
avatar.clap()
avatar.jump()
avatar.dance()           // hip sway with counter-rotating spine
avatar.thumbsUp()
```

Gestures support **queuing**: if a gesture is triggered while another is active, the current one accelerates to its exit phase and the new one starts immediately after. Only one gesture can be pending at a time.

Gestures are **procedural** — they animate bones directly, so no embedded animation clips are needed in the model file.

---

### States (UI feedback)

States combine an expression + animation + a pulsing color ring:

```ts
avatar.loading()      // thinking expression + blue ring
avatar.success()      // happy expression + Yes animation + green ring
avatar.error()        // sad expression + No animation + red ring
avatar.warning()      // surprised expression + orange ring
avatar.typing()       // thinking expression, no ring
avatar.listening()    // smile expression + blue ring
avatar.processing()   // thinking expression + blue ring
avatar.complete()     // happy expression + ThumbsUp animation + green ring

avatar.setState("listening")  // generic setter
avatar.clearState()           // reset expression, animation, and ring
```

---

### Speech & Lip Sync

```ts
// Play audio with automatic lip sync (AudioBuffer, ArrayBuffer, or URL)
await avatar.talk(audioBuffer)

// Manual control
avatar.startTalking()
avatar.stopTalking()
avatar.pauseTalking()

// Explicit phoneme/mouth control
avatar.setViseme("aa")     // phoneme-level lip sync
avatar.setMouth(0.6)       // direct mouth openness: 0 = closed, 1 = fully open
avatar.setVolume(0.8)      // amplitude-driven mouth movement
```

Supported visemes: `"sil"` `"PP"` `"FF"` `"TH"` `"DD"` `"kk"` `"CH"` `"SS"` `"nn"` `"RR"` `"aa"` `"E"` `"ih"` `"oh"` `"ou"`

---

### Look

```ts
avatar.lookAtMouse()          // follow mouse cursor
avatar.lookAt(400, 300)       // look at screen coordinates (px)
avatar.lookForward()          // return to center
avatar.randomLook()           // random periodic look
```

---

### Visibility & Layout

```ts
avatar.show()
avatar.hide()
avatar.move(100, 200)         // absolute position (px from top-left)
avatar.position("top-left")   // corner preset
avatar.size(240)              // resize widget
avatar.scale(1.2)             // relative scale
```

---

### Animations

```ts
avatar.play("Wave")    // play a named clip from the GLB/VRM file
avatar.stop()
```

---

### Events

```ts
avatar.on("loaded",         () => console.log("avatar ready"))
avatar.on("modelLoaded",    (_, { model }) => console.log("model:", model))
avatar.on("click",          () => avatar.wave())
avatar.on("speechStart",    () => console.log("talking…"))
avatar.on("speechEnd",      () => console.log("done"))
avatar.on("animationStart", (_, data) => console.log(data))
avatar.on("animationEnd",   () => {})

avatar.off("click", handler)  // remove a specific listener
```

Available events: `"click"` `"loaded"` `"modelLoaded"` `"animationStart"` `"animationEnd"` `"speechStart"` `"speechEnd"`

---

### Load models

```ts
// By name — resolved from CDN (@mymo/model-{name})
await avatar.load("maya")
await avatar.load("robot")

// By direct URL — GLB and VRM both supported
await avatar.load("https://example.com/my-avatar.glb")
await avatar.load("https://example.com/my-avatar.vrm")

// Local file
await avatar.load("/models/my-avatar.vrm")
```

---

### Lifecycle

```ts
avatar.destroy()  // removes widget from DOM, stops all loops
```

> All methods except `destroy()` are chainable.

---

## Plugins

### TTS integration (manual)

The SDK has no built-in TTS provider — call any TTS service from your **backend**, pass the audio to `avatar.talk()`, and lip sync works automatically.

Example with ElevenLabs:

```ts
// Your backend endpoint (Express, Next.js API Route, Edge Function, etc.)
// POST /api/speak  { text: string }  →  returns audio/mpeg

// Frontend
async function speak(text: string) {
  avatar.setState("loading")

  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    avatar.setState("error")
    return
  }

  const audio = await res.arrayBuffer()
  avatar.clearState()
  await avatar.talk(audio)  // lip sync kicks in automatically
}
```

Keeping the TTS call on the backend means your API key is never exposed to the browser. The pattern is the same for any provider: OpenAI TTS, Azure Speech, Google Cloud TTS, etc.

### Build your own plugin

```ts
import type { AvatarPlugin } from "@mymo/avatar"

const myPlugin: AvatarPlugin = {
  name: "my-plugin",
  install(avatar) {
    avatar.on("click", () => avatar.wave())
  },
}

avatar.use(myPlugin)
```

The `install` function receives the full `AvatarApi` (all public methods). Plugins are registered once and live for the lifetime of the avatar.

---

## Framework integrations

### Vanilla JS / TypeScript

No adapter needed — import and go:

```ts
import { Avatar } from "@mymo/avatar"

const avatar = new Avatar({ model: "maya", framing: "bust", theme: "dark" })

document.querySelector("#wave-btn")?.addEventListener("click", () => avatar.wave())
```

---

### React

```bash
npm install @mymo/react @mymo/avatar three
```

**Hook**

```tsx
import { useAvatar } from "@mymo/react"

function MyComponent() {
  const avatarRef = useAvatar({
    model: "https://...",
    position: "bottom-right",
    framing: "bust",
    idle: true,
    blink: true,
  })

  return <button onClick={() => avatarRef.current?.wave()}>Wave</button>
}
```

`useAvatar` creates the avatar on mount and calls `destroy()` on unmount. The returned `RefObject<Avatar>` gives you the full imperative API.

**Component**

```tsx
import { useRef } from "react"
import { AvatarWidget } from "@mymo/react"
import type { Avatar } from "@mymo/avatar"

export function App() {
  const ref = useRef<Avatar | null>(null)

  return (
    <>
      <AvatarWidget
        ref={ref}
        model="https://..."
        position="bottom-right"
        theme="dark"
        framing="bust"
        idle
        blink
        draggable
      />
      <button onClick={() => ref.current?.smile()}>Smile</button>
    </>
  )
}
```

`AvatarWidget` renders no DOM output — it mounts the avatar directly to `document.body`. Control it via the forwarded ref.

---

### Vue 3

```bash
npm install @mymo/vue @mymo/avatar three
```

**Composable**

```vue
<script setup lang="ts">
import { useAvatar } from "@mymo/vue"

const avatar = useAvatar({
  model: "https://...",
  position: "bottom-right",
  framing: "bust",
  idle: true,
  blink: true,
})
// avatar is a ShallowRef<Avatar | null>
</script>

<template>
  <button @click="avatar.value?.wave()">Wave</button>
</template>
```

`useAvatar` creates the avatar in `onMounted` and destroys it in `onUnmounted`.

**Component**

```vue
<script setup lang="ts">
import { ref } from "vue"
import { AvatarWidget } from "@mymo/vue"

const widgetRef = ref()
const avatar = () => widgetRef.value?.avatar.value
</script>

<template>
  <AvatarWidget
    ref="widgetRef"
    model="https://..."
    position="bottom-right"
    theme="dark"
    framing="bust"
    :idle="true"
    :blink="true"
    :draggable="true"
  />
  <button @click="avatar()?.wave()">Wave</button>
</template>
```

Access the avatar instance via `widgetRef.value.avatar.value` (the component exposes a `avatar` ShallowRef).

---

### Next.js

```bash
npm install @mymo/react @mymo/avatar three
```

The avatar uses WebGL and `document.body`, so it must run **client-side only**. Always use `dynamic` with `ssr: false`.

**App Router (recommended)**

```tsx
// app/components/AvatarDemo.tsx
"use client"

import { useAvatar } from "@mymo/react"

export default function AvatarDemo() {
  const avatarRef = useAvatar({
    model: "https://...",
    position: "bottom-right",
    framing: "bust",
  })

  return <button onClick={() => avatarRef.current?.wave()}>Wave</button>
}
```

```tsx
// app/page.tsx
import dynamic from "next/dynamic"

const AvatarDemo = dynamic(() => import("./components/AvatarDemo"), { ssr: false })

export default function Page() {
  return <AvatarDemo />
}
```

Add `transpilePackages` to `next.config.ts`:

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@mymo/avatar", "@mymo/react"],
}

export default nextConfig
```

**Pages Router**

```tsx
// pages/index.tsx
import dynamic from "next/dynamic"

const AvatarWidget = dynamic(
  () => import("@mymo/react").then(m => m.AvatarWidget),
  { ssr: false }
)

export default function Home() {
  return (
    <AvatarWidget
      model="https://..."
      position="bottom-right"
      framing="bust"
      theme="dark"
    />
  )
}
```

---

### CDN (UMD)

No build step required:

```html
<script src="https://unpkg.com/three@0.165.0/build/three.min.js"></script>
<script src="https://unpkg.com/@mymo/avatar/dist/mymo-avatar.umd.js"></script>
<script>
  const { Avatar } = MymoAvatar
  const avatar = new Avatar({ model: "maya", theme: "dark", framing: "bust" })
</script>
```

---

## Model formats

### VRM — recommended

VRM is the first-class format. All features work out of the box on any valid VRM file because the spec enforces standardized bone names and blendshapes. Gestures are procedurally animated — no embedded animation clips required.

```ts
await avatar.load("https://example.com/my-avatar.vrm")
```

Good sources: [VRoid Studio](https://vroid.com/en/studio), [VRoid Hub](https://hub.vroid.com), [Booth](https://booth.pm).

### GLB — best-effort

GLB files are supported but feature availability depends on what the model includes. A `console.warn` is emitted at load time. For each feature to work, the model must ship the corresponding data:

| Feature | Requirement |
|---|---|
| Expressions | Morph targets named `Smile`, `Sad`, `Happy`, `Angry`, etc. |
| Lip sync | Morph targets: `mouthOpen`, `jawOpen`, or `viseme_*` |
| Blink | Morph targets: `Blink` or `eyesClosed` |
| Gestures | Animation clips: `Wave`, `Nod`, `Dance`, etc. |
| Head look | Bone named `Head`, `head`, or `mixamorigHead` |

Missing features degrade gracefully and are skipped silently after the initial load warning.

### Built-in models

Named models are resolved from the CDN automatically:

```ts
await avatar.load("maya")    // @mymo/model-maya
await avatar.load("robot")   // @mymo/model-robot
await avatar.load("fox")     // @mymo/model-fox
```

---

## TypeScript

All types are exported from `@mymo/avatar`:

```ts
import type {
  AvatarOptions,
  AvatarPosition,       // "bottom-right" | "bottom-left" | "top-right" | "top-left"
  AvatarTheme,          // "light" | "dark" | "transparent"
  AvatarFraming,        // "full" | "half" | "bust" | "face"
  AvatarEvent,          // "click" | "loaded" | "modelLoaded" | "animationStart" | "animationEnd" | "speechStart" | "speechEnd"
  AvatarState,          // "loading" | "success" | "error" | "warning" | "typing" | "listening" | "processing" | "complete"
  AvatarPlugin,
  AvatarApi,
  Expression,           // "smile" | "sad" | "happy" | "angry" | "surprised" | "thinking" | "confused" | "sleep" | "idle"
  Gesture,              // "wave" | "nod" | "yes" | "no" | "shakeHead" | "clap" | "jump" | "dance" | "thumbsUp"
  Viseme,
  FramingSliceConfig,
  FramingModeConfig,
  ThemeConfig,
} from "@mymo/avatar"
```

---

## Browser support

Chrome 90+, Firefox 88+, Safari 15+, Edge 90+

---

## License

MIT
