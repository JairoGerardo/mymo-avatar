import * as THREE from "three"
import type { AvatarOptions, AvatarPosition, AvatarFraming } from "../types/index.js"

type TickCallback = (delta: number) => void

type FramingConfig = { camY: number; camZ: number; lookY: number }

const FRAMING: Record<AvatarFraming, FramingConfig> = {
  full:  { camY: 0.0,  camZ: 2.8, lookY: 0.0 },
  half:  { camY: 0.5,  camZ: 2.0, lookY: 0.4  },
  bust:  { camY: 0.80, camZ: 1.0, lookY: 0.55 },
  face:  { camY: 0.80,  camZ: 0.7, lookY: 0.7 },
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
  private clock = new THREE.Clock()
  private rafId = 0
  private tickCallbacks: TickCallback[] = []
  private currentModel: THREE.Object3D | null = null

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  }

  setup(options: Required<AvatarOptions>): void {
    this.webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.webgl.setSize(options.size, options.size)
    this.webgl.shadowMap.enabled = options.shadows
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap
    this.webgl.outputColorSpace = THREE.SRGBColorSpace
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping

    this._setupLights()
    this._createContainer(options)
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

    this._applyTheme(options.theme, options.size)
    this._applyPosition(options.position)

    this.container.appendChild(this.webgl.domElement)
    document.body.appendChild(this.container)

    if (options.draggable) this._makeDraggable()
  }

  private _applyTheme(theme: string, size: number): void {
    const s = this.container.style
    if (theme === "dark") {
      s.background = "radial-gradient(circle at 40% 35%, #2a2a4a 0%, #0d0d1a 100%)"
      s.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.08)`
    } else if (theme === "light") {
      s.background = "radial-gradient(circle at 40% 35%, #f8f8ff 0%, #e0e0f0 100%)"
      s.boxShadow = `0 8px 32px rgba(0,0,0,0.15), 0 0 0 2px rgba(0,0,0,0.06)`
    }
    // transparent: sin fondo ni sombra
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
    const tick = () => {
      this.rafId = requestAnimationFrame(tick)
      const delta = this.clock.getDelta()
      for (const cb of this.tickCallbacks) cb(delta)
      this.webgl.render(this.scene, this.camera)
    }
    tick()
  }

  private _makeDraggable(): void {
    let dragging = false
    let ox = 0
    let oy = 0

    this.container.addEventListener("pointerdown", (e) => {
      dragging = true
      const rect = this.container.getBoundingClientRect()
      ox = e.clientX - rect.left
      oy = e.clientY - rect.top
      this.container.style.transition = "none"
      e.preventDefault()
    })

    window.addEventListener("pointermove", (e) => {
      if (!dragging) return
      const s = this.container.style
      s.top = s.bottom = s.left = s.right = ""
      s.left = `${e.clientX - ox}px`
      s.top = `${e.clientY - oy}px`
    })

    window.addEventListener("pointerup", () => {
      dragging = false
    })
  }

  addTickCallback(fn: TickCallback): void {
    this.tickCallbacks.push(fn)
  }

  setModel(model: THREE.Object3D): void {
    if (this.currentModel) this.scene.remove(this.currentModel)
    this.currentModel = model
    this._autoFit(model)
    this.scene.add(model)
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
    const { camY, camZ, lookY } = FRAMING[framing]
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
    this._applyFraming(framing)
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
    cancelAnimationFrame(this.rafId)
    this.tickCallbacks = []
    this.webgl.dispose()
    this.container.remove()
  }
}
