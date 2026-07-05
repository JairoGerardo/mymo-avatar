# mymo-avatar

Lightweight animated 3D avatar SDK for any web application.

- **23 KB gzip** (core, Three.js not included)
- **60 FPS** WebGL rendering via Three.js
- **Framework-agnostic** — Vanilla, React, Vue, Next.js, Nuxt, Svelte, Electron
- **AI-agnostic** — works standalone or with any LLM/TTS provider
- **< 5 min** to integrate

**[Live Demo →](https://mymosdk.meshicode.com)**

---

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
npm install @mymosdk/avatar three

# pnpm
pnpm add @mymosdk/avatar three

# yarn
yarn add @mymosdk/avatar three
```

> Three.js is a peer dependency. If you already have it in your project, you only need `@mymosdk/avatar`.

---

## Quickstart

```ts
import { Avatar } from "@mymosdk/avatar"

const avatar = new Avatar({
  // Pass any GLB or VRM URL hosted on a CORS-enabled server.
  // See "Model hosting" below for details.
  model: "https://your-cdn.example.com/my-avatar.vrm",
  position: "bottom-right",
  size: 200,
  theme: "dark",
  framing: "bust",
})
```

The avatar mounts itself to `document.body` as a fixed floating widget immediately.

---

## Model hosting

The SDK loads models via the browser's `fetch` / XHR APIs, so the server that hosts your `.vrm` or `.glb` file **must send CORS headers** (`Access-Control-Allow-Origin: *`).

| Hosting option | CORS | Notes |
|---|---|---|
| Your own server / CDN | ✅ configure it | Full control |
| Cloudflare R2 (free tier) | ✅ built-in | Recommended for production |
| GitHub Pages | ✅ built-in | Free, served from your repo |
| Local `public/` folder | ✅ same-origin | Use during development |
| **GitHub Releases** | ❌ not supported | Redirects to a domain that blocks browser CORS |

```ts
// ✅ Works — CORS-enabled CDN
avatar.load("https://your-cdn.example.com/my-avatar.vrm")

// ✅ Works — local file served by Vite / webpack dev server
avatar.load("/models/my-avatar.vrm")

// ❌ Will fail in the browser — GitHub Releases don't support CORS
avatar.load("https://github.com/user/repo/releases/download/tag/file.vrm")
```

---

## API

### Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | — | GLB or VRM URL to load on init |
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
import type { AvatarPlugin } from "@mymosdk/avatar"

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
import { Avatar } from "@mymosdk/avatar"

const avatar = new Avatar({ model: "https://example.com/my-avatar.vrm", framing: "bust", theme: "dark" })

document.querySelector("#wave-btn")?.addEventListener("click", () => avatar.wave())
```

---

### React

```bash
npm install @mymosdk/avatar three
```

**Hook**

```tsx
import { useAvatar } from "@mymosdk/avatar/react"

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
import { AvatarWidget } from "@mymosdk/avatar/react"
import type { Avatar } from "@mymosdk/avatar"

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
npm install @mymosdk/avatar three
```

**Composable**

```vue
<script setup lang="ts">
import { useAvatar } from "@mymosdk/avatar/vue"

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
import { AvatarWidget } from "@mymosdk/avatar/vue"

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
npm install @mymosdk/avatar three
```

The avatar uses WebGL and `document.body`, so it must run **client-side only**. Always use `dynamic` with `ssr: false`.

**App Router (recommended)**

```tsx
// app/components/AvatarDemo.tsx
"use client"

import { useAvatar } from "@mymosdk/avatar/react"

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
  transpilePackages: ["@mymosdk/avatar"],
}

export default nextConfig
```

**Pages Router**

```tsx
// pages/index.tsx
import dynamic from "next/dynamic"

const AvatarWidget = dynamic(
  () => import("@mymosdk/avatar/react").then(m => m.AvatarWidget),
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

### Nuxt 3

```bash
npm install @mymosdk/avatar three
```

The avatar uses WebGL and `document.body`, so it must run client-side only. Wrap any component that uses the SDK with `<ClientOnly>`.

**Plugin** — create `plugins/avatar.client.ts` (the `.client.ts` suffix makes Nuxt skip it on the server):

```ts
// plugins/avatar.client.ts
export default defineNuxtPlugin(() => {
  // Client-only setup. Import Avatar here for a global instance,
  // or use it directly inside <ClientOnly> components.
})
```

**Page / component**

```vue
<!-- pages/index.vue -->
<template>
  <ClientOnly>
    <AvatarDemo />
  </ClientOnly>
</template>
```

```vue
<!-- components/AvatarDemo.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { Avatar } from "@mymosdk/avatar"

let avatar: Avatar

onMounted(() => {
  avatar = new Avatar({ model: "https://...", position: "bottom-right", framing: "bust" })
  avatar.on("click", () => avatar.wave())
})

onUnmounted(() => avatar?.destroy())
</script>
```

> The `<ClientOnly>` wrapper is the only Nuxt-specific step — the rest is standard Vue 3.

---

### Svelte

```bash
npm install @mymosdk/avatar three
```

**Composable**

```svelte
<script lang="ts">
  import { useAvatar } from "@mymosdk/avatar/svelte"

  const avatar = useAvatar({
    model: "https://...",
    position: "bottom-right",
    framing: "bust",
    idle: true,
    blink: true,
  })
  // avatar is a Svelte Writable<Avatar | null>
</script>

<button on:click={() => $avatar?.wave()}>Wave</button>
```

`useAvatar` creates the avatar in `onMount` and calls `destroy()` in `onDestroy` via the returned cleanup function. Access the instance with the `$` store shorthand.

**Direct usage** (without the composable)

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { Avatar } from "@mymosdk/avatar"

  let avatar: Avatar

  onMount(() => {
    avatar = new Avatar({ model: "https://...", position: "bottom-right", framing: "bust" })
  })

  onDestroy(() => avatar?.destroy())
</script>

<button on:click={() => avatar?.smile()}>Smile</button>
```

---

### Electron

```bash
npm install @mymosdk/avatar three
```

The avatar runs entirely in the **renderer process** — no main-process changes are needed beyond the standard security settings.

**Main process** (`main.js`)

```js
const { app, BrowserWindow } = require("electron")
const path = require("path")

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,   // required
      nodeIntegration: false,   // required
      preload: path.join(__dirname, "preload.js"),
    },
  })
  win.loadFile("dist/renderer/index.html")
}

app.whenReady().then(createWindow)
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
```

**Renderer process** (`renderer/main.ts`)

```ts
import { Avatar } from "@mymosdk/avatar"

const avatar = new Avatar({
  model: "/Maya.vrm",   // served from the app's public/ folder
  position: "bottom-right",
  framing: "bust",
  theme: "dark",
  idle: true,
  blink: true,
})

avatar.on("click", () => avatar.wave())
```

> Electron's renderer is a full browser context — all Web Audio and WebGL APIs are available. No special guards needed.

---

### Angular

```bash
npm install @mymosdk/avatar three
```

Import from `@mymosdk/avatar/angular`. The package ships a **standalone directive** (`AvatarDirective`) and an `AvatarModule` for NgModule-based projects.

**Standalone component**

```ts
// app.component.ts
import { Component, ViewChild } from "@angular/core"
import { AvatarDirective } from "@mymosdk/avatar/angular"

@Component({
  standalone: true,
  imports: [AvatarDirective],
  template: `
    <div
      mymoAvatar
      model="https://..."
      position="bottom-right"
      framing="bust"
      theme="dark"
      [idle]="true"
      [blink]="true"
      [draggable]="true"
      (avatarLoaded)="onLoaded()"
      (avatarClicked)="onClicked()"
    ></div>
    <button (click)="wave()">Wave</button>
  `,
})
export class AppComponent {
  @ViewChild(AvatarDirective) avatarDir!: AvatarDirective

  onLoaded()  { console.log("avatar ready") }
  onClicked() { this.avatarDir.avatar?.wave() }
  wave()      { this.avatarDir.avatar?.wave() }
}
```

**NgModule-based project**

```ts
// app.module.ts
import { NgModule } from "@angular/core"
import { AvatarModule } from "@mymosdk/avatar/angular"

@NgModule({ imports: [AvatarModule], ... })
export class AppModule {}
```

**Available inputs**

| Input | Type |
|---|---|
| `model` | `string` |
| `position` | `AvatarPosition` |
| `size` | `number` |
| `theme` | `AvatarTheme` |
| `framing` | `AvatarFraming` |
| `draggable` | `boolean` |
| `idle` | `boolean` |
| `blink` | `boolean` |
| `lipSync` | `boolean` |
| `followMouse` | `boolean` |
| `zIndex` | `number` |

**Available outputs**

| Output | Payload |
|---|---|
| `avatarLoaded` | `void` |
| `avatarClicked` | `void` |
| `avatarError` | `{ message: string }` |

`ngOnChanges` handles `model`, `position`, `size`, `theme`, and `framing` reactively — update the input and the avatar updates automatically. Access the full imperative API via `@ViewChild(AvatarDirective).avatar`.

---

### CDN (UMD)

No build step required:

```html
<script src="https://unpkg.com/three@0.165.0/build/three.min.js"></script>
<script src="https://unpkg.com/@mymosdk/avatar/dist/mymo-avatar.umd.js"></script>
<script>
  const { Avatar } = MymoAvatar
  const avatar = new Avatar({ model: "https://example.com/my-avatar.vrm", theme: "dark", framing: "bust" })
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

> **Coming in v1.1.** Named models (`maya`, `robot`, `fox`) will be published as separate npm packages (`@mymo/model-maya`, etc.) and resolved from CDN automatically. Use a direct URL in the meantime:

```ts
// Use any GLB or VRM by URL today
await avatar.load("https://example.com/my-avatar.vrm")
await avatar.load("https://example.com/my-avatar.glb")
await avatar.load("/models/local-avatar.vrm")  // local file
```

Good free VRM sources: [VRoid Hub](https://hub.vroid.com), [Booth](https://booth.pm).

---

## TypeScript

All types are exported from `@mymosdk/avatar`:

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
} from "@mymosdk/avatar"
```

---

## Browser support

Chrome 90+, Firefox 88+, Safari 15+, Edge 90+

---

## License

MIT
