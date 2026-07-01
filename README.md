# mymo-avatar

Lightweight animated 3D avatar SDK for any web application.

- **23 KB gzip** (core, Three.js not included)
- **60 FPS** WebGL rendering
- **Framework-agnostic** — Vanilla, React, Vue, Next.js, Nuxt, Svelte, Electron
- **AI-agnostic** — works standalone or with any LLM/TTS provider
- **< 5 min** to integrate

## Installation

```bash
npm install @mymo/avatar three
```

> Three.js is a peer dependency. If you already have it, you only need `@mymo/avatar`.

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

That's it — the avatar mounts itself to `document.body` as a fixed floating widget.

## API

### Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `"maya"` | Model name or GLB/VRM URL |
| `position` | `AvatarPosition` | `"bottom-right"` | Corner preset |
| `size` | `number` | `200` | Size in px |
| `theme` | `"light" \| "dark" \| "transparent"` | `"light"` | Background theme |
| `framing` | `AvatarFraming` | `"full"` | Camera framing preset |
| `framingConfig` | `FramingSliceConfig` | `{}` | Per-mode framing fine-tuning |
| `draggable` | `boolean` | `false` | Allow drag & drop |
| `shadows` | `boolean` | `false` | Enable shadow rendering |
| `idle` | `boolean` | `true` | Enable idle animations |
| `idleInterval` | `number` | `8000` | Idle micro-expression interval (ms) |
| `blink` | `boolean` | `true` | Enable auto-blink |
| `blinkInterval` | `number` | `3500` | Blink interval (ms) |
| `lipSync` | `boolean` | `true` | Enable audio-driven lip sync |
| `followMouse` | `boolean` | `false` | Auto-track mouse cursor |
| `autoHide` | `boolean` | `false` | Auto-hide on scroll |
| `zIndex` | `number` | `99999` | CSS z-index |

### Framing

Control how much of the model is visible in the widget:

```ts
avatar.frame("full")   // entire body
avatar.frame("half")   // waist up
avatar.frame("bust")   // chest up
avatar.frame("face")   // head only
```

Fine-tune each framing mode at runtime:

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

### Expressions

```ts
avatar.smile()        // or avatar.expression("smile", 0.8)
avatar.sad()
avatar.happy()
avatar.angry()
avatar.surprised()
avatar.thinking()
avatar.confused()
avatar.sleep()
avatar.idle()         // reset to neutral
```

### Gestures

```ts
avatar.wave()
avatar.nod()
avatar.yes()          // affirmative nods (larger amplitude than nod)
avatar.no()           // deliberate side-to-side shakes
avatar.shakeHead()
avatar.point()
avatar.clap()
avatar.jump()
avatar.dance()        // hip sway with counter-rotating spine
```

Gestures support **queuing**: if a gesture is triggered while another is active, the current one accelerates to its exit phase and the new one starts immediately after. Only one gesture can be pending at a time.

### States (UI feedback)

States combine an expression + animation clip + a pulsing ring color:

```ts
avatar.loading()      // thinking + blue ring
avatar.success()      // happy + Yes animation + green ring
avatar.error()        // sad + No animation + red ring
avatar.warning()      // surprised + orange ring
avatar.typing()       // thinking, no ring
avatar.listening()    // smile + blue ring
avatar.processing()   // thinking + blue ring
avatar.complete()     // happy + ThumbsUp animation + green ring
avatar.setState("listening")  // generic setter
avatar.clearState()   // reset everything
```

### Speech & Lip Sync

```ts
// Play audio (AudioBuffer, ArrayBuffer, or URL) with auto lip sync
await avatar.talk(audioBuffer)

// Manual control
avatar.startTalking()
avatar.stopTalking()
avatar.pauseTalking()

// Explicit viseme/mouth control
avatar.setViseme("aa")      // phoneme-level lip sync
avatar.setMouth(0.6)        // 0 = closed, 1 = fully open
avatar.setVolume(0.8)       // amplitude-driven mouth
```

Supported visemes: `"sil"` `"PP"` `"FF"` `"TH"` `"DD"` `"kk"` `"CH"` `"SS"` `"nn"` `"RR"` `"aa"` `"E"` `"ih"` `"oh"` `"ou"`

### Look

```ts
avatar.lookAtMouse()          // follow mouse cursor
avatar.lookAt(400, 300)       // look at screen coordinates
avatar.lookForward()          // return to center
avatar.randomLook()           // random periodic look
```

### Visibility & Layout

```ts
avatar.show()
avatar.hide()
avatar.move(100, 200)         // absolute position (px)
avatar.position("top-left")   // corner preset
avatar.size(240)              // resize
avatar.scale(1.2)             // relative scale
```

### Animations

```ts
avatar.play("Wave")    // play clip by name (from GLB/VRM)
avatar.stop()
```

### Events

```ts
avatar.on("loaded",         () => console.log("ready"))
avatar.on("modelLoaded",    (_, { model }) => console.log(model))
avatar.on("click",          () => avatar.wave())
avatar.on("speechStart",    () => console.log("talking..."))
avatar.on("speechEnd",      () => console.log("done"))
avatar.on("animationStart", (_, data) => console.log(data))
avatar.on("animationEnd",   () => {})

avatar.off("click", handler)  // remove listener
```

### Plugins

```ts
import { createElevenLabsPlugin } from "@mymo/plugin-elevenlabs"

const { plugin, controller } = createElevenLabsPlugin({
  apiKey: "your-key",
  voiceId: "21m00Tcm4TlvDq8ikWAM",   // optional, default: Rachel
  modelId: "eleven_multilingual_v2",  // optional
})
avatar.use(plugin)

await controller.speak("Hello! I'm your virtual assistant.")
```

Build your own plugin:

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

### Load different models

```ts
// By name (resolved from CDN) or direct URL — GLB and VRM supported
await avatar.load("robot")
await avatar.load("https://example.com/my-avatar.glb")
await avatar.load("https://example.com/my-avatar.vrm")
```

### Lifecycle

```ts
avatar.destroy()  // removes from DOM, stops all loops
```

> All methods except `destroy()` are chainable.

## React

```bash
npm install @mymo/react @mymo/avatar three
```

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
        idle blink draggable
      />
      <button onClick={() => ref.current?.wave()}>Wave</button>
    </>
  )
}
```

Or use the hook directly:

```tsx
import { useAvatar } from "@mymo/react"

function MyComponent() {
  const avatarRef = useAvatar({
    model: "https://...",
    position: "bottom-right",
    framing: "bust",
  })

  return <button onClick={() => avatarRef.current?.smile()}>Smile</button>
}
```

## Vue

```bash
npm install @mymo/vue @mymo/avatar three
```

```vue
<script setup lang="ts">
import { useAvatar } from "@mymo/vue"
import type { Avatar } from "@mymo/avatar"

const avatar = useAvatar({
  model: "https://...",
  position: "bottom-right",
  framing: "bust",
})
// avatar is a ShallowRef<Avatar | null>
</script>

<template>
  <button @click="avatar.value?.wave()">Wave</button>
</template>
```

Or with the component:

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

## CDN (UMD)

```html
<script src="https://unpkg.com/three@0.165.0/build/three.min.js"></script>
<script src="https://unpkg.com/@mymo/avatar/dist/mymo-avatar.umd.js"></script>
<script>
  const { Avatar } = MymoAvatar
  const avatar = new Avatar({ model: "https://...", theme: "dark", framing: "bust" })
</script>
```

## Model formats

### VRM — recommended

VRM is the first-class format. All features are guaranteed: expressions, gestures, lip sync, blink, and head look work out of the box on any valid VRM file because the spec enforces standardized bone names and blendshapes. Gestures are procedurally animated — no embedded animation clips required.

```ts
await avatar.load("https://example.com/my-avatar.vrm")
```

Good sources: [VRoid Studio](https://vroid.com/en/studio), [VRoid Hub](https://hub.vroid.com), [Booth](https://booth.pm).

### GLB — best-effort

GLB files are supported but features depend on what the model includes. A `console.warn` is emitted at load time as a reminder. For each feature to work, the model must ship the corresponding data:

| Feature | Requirement |
|---|---|
| Expressions | Morph targets named `Smile`, `Sad`, `Happy`, `Angry`, etc. |
| Lip sync | Morph targets: `mouthOpen`, `jawOpen`, or `viseme_*` |
| Blink | Morph targets: `Blink` or `eyesClosed` |
| Gestures | Animation clips: `Wave`, `Nod`, `Dance`, etc. |
| Head look | Bone named `Head`, `head`, or `mixamorigHead` |

If these are absent the SDK degrades gracefully — missing features are skipped silently after the initial load warning.

## TypeScript

All types are exported from `@mymo/avatar`:

```ts
import type {
  AvatarOptions,
  AvatarPosition,    // "bottom-right" | "bottom-left" | "top-right" | "top-left"
  AvatarTheme,       // "light" | "dark" | "transparent"
  AvatarFraming,     // "full" | "half" | "bust" | "face"
  AvatarEvent,       // "click" | "loaded" | "modelLoaded" | "animationStart" | "animationEnd" | "speechStart" | "speechEnd"
  AvatarState,       // "loading" | "success" | "error" | "warning" | "typing" | "listening" | "processing" | "complete"
  AvatarPlugin,
  AvatarApi,
  Expression,        // "smile" | "sad" | "happy" | "angry" | "surprised" | "thinking" | "confused" | "sleep" | "idle"
  Gesture,           // "wave" | "nod" | "yes" | "no" | "shakeHead" | "point" | "clap" | "jump" | "dance"
  Viseme,
  FramingSliceConfig,
  FramingModeConfig,
} from "@mymo/avatar"
```

## Browser support

Chrome 90+, Firefox 88+, Safari 15+, Edge 90+

## License

MIT
