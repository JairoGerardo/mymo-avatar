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
  size: 180,
  theme: "dark",
})
```

That's it — the avatar mounts itself to `document.body` as a fixed floating widget.

## API

### Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `"maya"` | Model name or GLB URL |
| `position` | `AvatarPosition` | `"bottom-right"` | Corner preset |
| `size` | `number` | `180` | Size in px |
| `theme` | `"light" \| "dark" \| "transparent"` | `"light"` | Background theme |
| `draggable` | `boolean` | `false` | Allow drag & drop |
| `idle` | `boolean` | `true` | Enable idle animations |
| `idleInterval` | `number` | `8000` | Idle micro-expression interval (ms) |
| `blink` | `boolean` | `true` | Enable auto-blink |
| `blinkInterval` | `number` | `3500` | Blink interval (ms) |
| `lipSync` | `boolean` | `true` | Enable audio-driven lip sync |
| `followMouse` | `boolean` | `false` | Auto-track mouse cursor |
| `zIndex` | `number` | `99999` | CSS z-index |

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
avatar.shakeHead()
avatar.point()
avatar.clap()
avatar.jump()
avatar.dance()
```

### States (UI feedback)

States combine expression + animation + a pulsing ring color:

```ts
avatar.loading()      // thinking + blue ring
avatar.success()      // happy + green ring
avatar.error()        // sad + red ring
avatar.warning()      // surprised + orange ring
avatar.typing()       // thinking, no ring
avatar.listening()    // smile + blue ring
avatar.processing()   // thinking + blue ring
avatar.complete()     // happy + green ring
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
avatar.play("Wave")    // play clip by name (from GLB)
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

const { plugin, controller } = createElevenLabsPlugin({ apiKey: "your-key" })
avatar.use(plugin)

await controller.speak("Hello! I'm your virtual assistant.")
```

### Load different models

```ts
await avatar.load("https://example.com/my-avatar.glb")
```

### Lifecycle

```ts
avatar.destroy()  // removes from DOM, stops all loops
```

## React

```bash
npm install @mymo/react
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
  })

  return <button onClick={() => avatarRef.current?.smile()}>Smile</button>
}
```

## Vue

```bash
npm install @mymo/vue
```

```vue
<script setup lang="ts">
import { ref } from "vue"
import { AvatarWidget } from "@mymo/vue"
import type { Avatar } from "@mymo/avatar"

const widgetRef = ref()
const avatar = () => widgetRef.value?.avatar.value as Avatar
</script>

<template>
  <AvatarWidget
    ref="widgetRef"
    model="https://..."
    position="bottom-right"
    theme="dark"
    :idle="true"
    :blink="true"
    :draggable="true"
  />
  <button @click="avatar()?.wave()">Wave</button>
</template>
```

Or use the composable:

```ts
import { useAvatar } from "@mymo/vue"

const avatar = useAvatar({ model: "https://...", position: "bottom-right" })
// avatar.value is the Avatar instance after mount
```

## CDN (UMD)

```html
<script src="https://unpkg.com/three@0.165.0/build/three.min.js"></script>
<script src="https://unpkg.com/@mymo/avatar/dist/mymo-avatar.umd.js"></script>
<script>
  const { Avatar } = MymoAvatar
  const avatar = new Avatar({ model: "https://...", theme: "dark" })
</script>
```

## Model requirements

Any GLB file works. For full feature support the model should include:

| Feature | Requirement |
|---|---|
| Expressions | Morph targets named `Smile`, `Sad`, `Happy`, `Angry`, etc. |
| Lip sync | Morph targets: `mouthOpen`, `jawOpen`, or `viseme_*` |
| Blink | Morph targets: `Blink`, `eyesClosed` |
| Gestures | Animation clips: `Wave`, `Nod`, `Dance`, etc. |
| Head look | Bone named `Head`, `head`, or `mixamorigHead` |

## Browser support

Chrome 90+, Firefox 88+, Safari 15+, Edge 90+

## License

MIT
