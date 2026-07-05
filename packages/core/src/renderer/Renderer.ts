import * as THREE from "three"
import type { AvatarOptions, AvatarPosition, AvatarFraming, FramingSliceConfig, ThemeConfig } from "../types/index.js"

type TickCallback = (delta: number) => void

type FramingConfig = { camY: number; camZ: number; lookY: number }

// [bottomFraction, topFraction, lookBias]
// lookBias: where in the slice the camera looks (0.5 = center, lower = look below → frame top rises)
const FRAMING_SLICES: Record<AvatarFraming, [number, number, number]> = {
  full: [0.00, 1.00, 0.50],
  half: [0.48, 1.00, 0.50],
  bust: [0.68, 1.00, 0.46],
  face: [0.80, 1.00, 0.36], // look well below center → full head/ears visible at top
}

// Fallback when no model is loaded yet
const FRAMING_FALLBACK: Record<AvatarFraming, FramingConfig> = {
  full:  { camY: 0.0,  camZ: 2.8, lookY: 0.0 },
  half:  { camY: 0.5,  camZ: 2.0, lookY: 0.4 },
  bust:  { camY: 0.80, camZ: 1.0, lookY: 0.55 },
  face:  { camY: 0.80, camZ: 0.7, lookY: 0.7 },
}

const POSITION_CSS: Record<AvatarPosition, Partial<Record<keyof CSSStyleDeclaration, string>>> = {
  "bottom-right": { bottom: "20px", right: "20px" },
  "bottom-left": { bottom: "20px", left: "20px" },
  "top-right": { top: "20px", right: "20px" },
  "top-left": { top: "20px", left: "20px" },
}

export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera

  private webgl!: THREE.WebGLRenderer
  private container!: HTMLDivElement
  private lastTime = 0
  private rafId = 0
  private tickCallbacks: TickCallback[] = []
  private currentModel: THREE.Object3D | null = null
  private currentFraming: AvatarFraming = "full"
  private currentTheme = "light"
  private modelFraming: Record<AvatarFraming, FramingConfig> | null = null
  private userSliceConfig: FramingSliceConfig = {}
  private userThemeConfig: ThemeConfig = {}

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  }

  setup(options: Required<AvatarOptions>): void {
    if (typeof window === "undefined") return
    this.webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.webgl.setSize(options.size, options.size)
    this.webgl.shadowMap.enabled = options.shadows
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap
    this.webgl.outputColorSpace = THREE.SRGBColorSpace
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping

    this._setupLights()
    if (options.themeConfig) this.userThemeConfig = options.themeConfig
    this._createContainer(options)
    this.currentFraming = options.framing
    if (options.framingConfig) this.userSliceConfig = options.framingConfig
    this._applyFraming(options.framing)
    this._startLoop()
  }

  private _setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8)
    const key = new THREE.DirectionalLight(0xffffff, 1.5)
    key.position.set(1.5, 3, 2.5)
    const fill = new THREE.DirectionalLight(0x8888ff, 0.5)
    fill.position.set(-2, 0, 1)
    this.scene.add(ambient, key, fill)
  }

  private _createContainer(options: Required<AvatarOptions>): void {
    this.container = document.createElement("div")
    const s = this.container.style
    s.position = "fixed"
    s.width = `${options.size}px`
    s.height = `${options.size}px`
    s.zIndex = String(options.zIndex)
    s.overflow = "hidden"
    s.borderRadius = "50%"
    s.cursor = "pointer"
    s.userSelect = "none"
    s.boxSizing = "border-box"

    this.currentTheme = options.theme
    this._applyTheme(options.theme, options.size)
    this._applyPosition(options.position)

    this.container.appendChild(this.webgl.domElement)
    document.body.appendChild(this.container)

    if (options.draggable) this._makeDraggable()
  }

  setTheme(theme: string): void {
    this.currentTheme = theme
    this._applyTheme(theme, 0)
  }

  setThemeConfig(config: ThemeConfig): void {
    this.userThemeConfig = { ...this.userThemeConfig, ...config }
    this._applyTheme(this.currentTheme, 0)
  }

  private _applyTheme(theme: string, _size: number): void {
    const s = this.container.style
    if (theme === "dark") {
      s.background = this.userThemeConfig.dark?.background ?? "radial-gradient(circle at 40% 35%, #2a2a4a 0%, #0d0d1a 100%)"
      s.boxShadow  = this.userThemeConfig.dark?.boxShadow  ?? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.08)`
    } else if (theme === "light") {
      s.background = this.userThemeConfig.light?.background ?? "radial-gradient(circle at 40% 35%, #f8f8ff 0%, #e0e0f0 100%)"
      s.boxShadow  = this.userThemeConfig.light?.boxShadow  ?? `0 8px 32px rgba(0,0,0,0.15), 0 0 0 2px rgba(0,0,0,0.06)`
    } else {
      s.background = "transparent"
      s.boxShadow = "none"
    }
    s.transition = "box-shadow 0.3s ease"
    s.setProperty("--ring-color", "transparent")

    // Inject state ring animation (once per document)
    if (!document.getElementById("__mymo_styles__")) {
      const style = document.createElement("style")
      style.id = "__mymo_styles__"
      style.textContent = `
        @keyframes mymo-ring {
          0%   { box-shadow: 0 0 0 0px var(--ring-color); }
          70%  { box-shadow: 0 0 0 10px transparent; }
          100% { box-shadow: 0 0 0 0px transparent; }
        }
        [data-state] { animation: mymo-ring 1.2s ease-out infinite; }
        [data-state=""] { animation: none; }
      `
      document.head.appendChild(style)
    }
  }

  private _applyPosition(preset: AvatarPosition): void {
    const s = this.container.style
    s.top = s.bottom = s.left = s.right = ""
    const pos = POSITION_CSS[preset]
    for (const [k, v] of Object.entries(pos)) {
      if (v !== undefined) (s as unknown as Record<string, string>)[k] = v
    }
  }

  private _startLoop(): void {
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick)
      const delta = this.lastTime ? (now - this.lastTime) / 1000 : 0
      this.lastTime = now
      for (const cb of this.tickCallbacks) cb(delta)
      this.webgl.render(this.scene, this.camera)
    }
    tick(0)
  }

  private _makeDraggable(): void {
    let dragging = false
    let ox = 0
    let oy = 0

    // Prevent browser from hijacking touch events for scroll/zoom
    this.container.style.touchAction = "none"

    this.container.addEventListener("pointerdown", (e) => {
      dragging = true
      this.container.setPointerCapture(e.pointerId)
      const rect = this.container.getBoundingClientRect()
      ox = e.clientX - rect.left
      oy = e.clientY - rect.top
      this.container.style.transition = "none"
      e.preventDefault()
    })

    this.container.addEventListener("pointermove", (e) => {
      if (!dragging) return
      const s = this.container.style
      s.top = s.bottom = s.left = s.right = ""
      s.left = `${e.clientX - ox}px`
      s.top = `${e.clientY - oy}px`
    })

    this.container.addEventListener("pointerup", () => {
      dragging = false
    })

    this.container.addEventListener("pointercancel", () => {
      dragging = false
    })
  }

  addTickCallback(fn: TickCallback): void {
    this.tickCallbacks.push(fn)
  }

  private _skeletonHelper: THREE.SkeletonHelper | null = null

  setModel(model: THREE.Object3D): void {
    if (this.currentModel) this.scene.remove(this.currentModel)
    if (this._skeletonHelper) { this.scene.remove(this._skeletonHelper); this._skeletonHelper = null }
    this.currentModel = model
    this._autoFit(model)
    this.scene.add(model)
    this.modelFraming = this._computeFraming(model)
    this._applyFraming(this.currentFraming)
  }

  // Toggle bone visualization for debugging — call avatar.renderer.debugBones()
  debugBones(visible?: boolean): void {
    if (!this.currentModel) return
    if (visible === false) {
      if (this._skeletonHelper) { this.scene.remove(this._skeletonHelper); this._skeletonHelper = null }
      return
    }
    if (this._skeletonHelper) {
      this.scene.remove(this._skeletonHelper)
      this._skeletonHelper = null
    } else {
      this._skeletonHelper = new THREE.SkeletonHelper(this.currentModel)
      this.scene.add(this._skeletonHelper)
    }
  }

  private _computeFraming(model: THREE.Object3D): Record<AvatarFraming, FramingConfig> {
    const box = new THREE.Box3().setFromObject(model)
    const totalHeight = box.max.y - box.min.y
    const tanHalfFov = Math.tan((this.camera.fov * Math.PI) / 180 / 2)

    const result = {} as Record<AvatarFraming, FramingConfig>
    for (const [mode, defaults] of Object.entries(FRAMING_SLICES) as [AvatarFraming, [number, number, number]][]) {
      const override = this.userSliceConfig[mode] ?? {}
      const from     = override.from     ?? defaults[0]
      const to       = override.to       ?? defaults[1]
      const bias     = override.lookBias ?? defaults[2]
      const sliceBottom = box.min.y + totalHeight * from
      const sliceTop    = box.min.y + totalHeight * to
      const sliceHeight = sliceTop - sliceBottom
      const lookY = sliceBottom + sliceHeight * bias
      const camZ  = (sliceHeight / 2 / tanHalfFov) * 1.15
      result[mode] = { camY: lookY, camZ, lookY }
    }
    return result
  }

  private _autoFit(model: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 1.8 / maxDim
    model.scale.setScalar(scale)
    // Center horizontally, shift down so head is in upper portion
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
  }

  private _applyFraming(framing: AvatarFraming): void {
    const { camY, camZ, lookY } = (this.modelFraming ?? FRAMING_FALLBACK)[framing]
    this.camera.position.set(0, camY, camZ)
    this.camera.lookAt(0, lookY, 0)
  }

  // ── Public controls ──────────────────────────────────────────────────────

  show(): void {
    this.container.style.display = ""
  }

  hide(): void {
    this.container.style.display = "none"
  }

  setFraming(framing: AvatarFraming): void {
    this.currentFraming = framing
    this._applyFraming(framing)
  }

  setFramingConfig(config: FramingSliceConfig): void {
    this.userSliceConfig = { ...this.userSliceConfig, ...config }
    if (this.currentModel) {
      this.modelFraming = this._computeFraming(this.currentModel)
      this._applyFraming(this.currentFraming)
    }
  }

  setPosition(preset: AvatarPosition): void {
    this._applyPosition(preset)
  }

  setSize(px: number): void {
    this.container.style.width = `${px}px`
    this.container.style.height = `${px}px`
    this.webgl.setSize(px, px)
  }

  moveTo(x: number, y: number): void {
    const s = this.container.style
    s.top = s.bottom = s.left = s.right = ""
    s.left = `${x}px`
    s.top = `${y}px`
  }

  getContainer(): HTMLDivElement {
    return this.container
  }

  dispose(): void {
    if (typeof window === "undefined") return
    cancelAnimationFrame(this.rafId)
    this.tickCallbacks = []
    this.webgl?.dispose()
    this.container?.remove()
  }
}
