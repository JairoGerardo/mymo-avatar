# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-07-01

Initial public release.

### Packages

- `@mymo/avatar@0.1.0` — core SDK
- `@mymo/react@0.1.0` — React wrapper
- `@mymo/vue@0.1.0` — Vue 3 wrapper

### Features

#### Core (`@mymo/avatar`)

- **Renderer** — Three.js WebGL, fixed floating container, `light`/`dark`/`transparent` themes
- **Asset Loader** — dynamic GLB loading via `GLTFLoader`; swap models at runtime with `avatar.load(url)`
- **Animation Engine** — `THREE.AnimationMixer` with crossfade transitions; idle loop; one-shot gestures
- **Expressions** — morph-target system with multi-candidate fallback: `smile`, `sad`, `happy`, `angry`, `surprised`, `thinking`, `confused`, `sleep`, `idle`
- **Gestures** — `wave`, `nod`, `shakeHead`, `point`, `clap`, `jump`, `dance`
- **Auto-blink** — configurable interval with random jitter
- **Head look** — world-space bone rotation, stable during animations; `lookAtMouse()`, `lookAt(x,y)`, `lookForward()`, `randomLook()`
- **Audio Engine** — Web Audio API playback for `AudioBuffer`, `ArrayBuffer`, and URLs
- **Lip Sync** — RMS amplitude analysis → `mouthOpen` morph target; 15 viseme phonemes; manual control via `setViseme()` / `setMouth()` / `setVolume()`
- **States** — 8 named states with expression + animation + pulsing CSS ring: `loading`, `success`, `error`, `warning`, `typing`, `listening`, `processing`, `complete`
- **Drag & Drop** — `draggable: true` option
- **Plugin System** — `avatar.use(plugin, options?)` with typed `AvatarApi` interface
- **Events** — typed `EventEmitter`: `click`, `loaded`, `modelLoaded`, `animationStart`, `animationEnd`, `speechStart`, `speechEnd`
- **Dual build** — ESM + CJS + UMD; Three.js as peer dependency
- **Bundle size** — 23 KB gzip (core only, without Three.js)

#### React (`@mymo/react`)

- `useAvatar(options)` hook — creates and destroys avatar on mount/unmount
- `<AvatarWidget ref={...} ...options />` — component with imperative ref access

#### Vue (`@mymo/vue`)

- `useAvatar(options)` composable — creates and destroys avatar on mount/unmount
- `<AvatarWidget ref="..." ...props />` — component exposing `avatar` ref

---

[0.1.0]: https://github.com/mymo/mymo-avatar/releases/tag/v0.1.0
