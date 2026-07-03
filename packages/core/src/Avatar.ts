import { EventEmitter } from "./events/EventEmitter.js"
import { Renderer } from "./renderer/Renderer.js"
import { AnimationEngine } from "./animation/AnimationEngine.js"
import { AudioEngine } from "./audio/AudioEngine.js"
import { LipSync } from "./audio/LipSync.js"
import { AssetLoader } from "./loader/AssetLoader.js"
import { PluginSystem } from "./plugins/PluginSystem.js"
import type {
  AvatarOptions,
  AvatarEvent,
  AvatarEventCallback,
  AvatarPlugin,
  AvatarPosition,
  AvatarFraming,
  AvatarTheme,
  ThemeConfig,
  Expression,
  Gesture,
  AvatarState,
  FramingSliceConfig,
} from "./types/index.js"
import type { Viseme } from "./audio/LipSync.js"

const STATE_RING_COLORS: Record<string, string> = {
  "pulse-blue":   "rgba(96,165,250,0.7)",
  "pulse-green":  "rgba(74,222,128,0.7)",
  "pulse-red":    "rgba(248,113,113,0.7)",
  "pulse-orange": "rgba(251,146,60,0.7)",
}

const DEFAULTS: Required<AvatarOptions> = {
  model: "maya",
  position: "bottom-right",
  size: 180,
  theme: "light",
  framing: "full",
  draggable: false,
  shadows: false,
  idle: true,
  idleInterval: 8000,
  blink: true,
  blinkInterval: 3500,
  lipSync: true,
  followMouse: false,
  autoHide: false,
  zIndex: 99999,
  framingConfig: {},
  themeConfig: {},
}

export class Avatar {
  private readonly options: Required<AvatarOptions>
  private readonly events: EventEmitter
  private readonly renderer: Renderer
  private readonly animation: AnimationEngine
  private readonly audio: AudioEngine
  private readonly lipSync: LipSync
  private readonly loader: AssetLoader
  private readonly plugins: PluginSystem

  constructor(options: AvatarOptions = {}) {
    this.options = { ...DEFAULTS, ...options }
    this.events = new EventEmitter()
    this.renderer = new Renderer()
    this.animation = new AnimationEngine()
    this.audio = new AudioEngine()
    this.lipSync = new LipSync(this.audio, (shape) => this.animation.setMouthMorph(shape))
    this.loader = new AssetLoader()
    this.plugins = new PluginSystem()

    this.renderer.setup(this.options)
    this.renderer.addTickCallback((delta) => this.animation.update(delta))

    this._bindContainerEvents()
    this._initialize().catch((err) => console.error("[mymo-avatar]", err))
  }

  private async _initialize(): Promise<void> {
    try {
      const model = await this.loader.load(this.options.model)
      this.renderer.setModel(model.scene)
      this.animation.init(model)

      if (this.options.idle) this.animation.startIdle(this.options.idleInterval)
      if (this.options.blink) this.animation.startBlink(this.options.blinkInterval)
      if (this.options.followMouse) this._bindMouseLook()

      this.events.emit("loaded")
      this.events.emit("modelLoaded", { model: this.options.model })
    } catch (err) {
      console.error("[mymo-avatar] Failed to load model:", err)
    }
  }

  private _bindContainerEvents(): void {
    this.renderer.getContainer().addEventListener("click", () => {
      this.events.emit("click")
    })
  }

  private _boundMouseLook = (e: MouseEvent) => {
    const dx = (e.clientX / window.innerWidth) * 2 - 1
    const dy = (e.clientY / window.innerHeight) * 2 - 1
    this.animation.lookAt(dx, dy)
  }

  private _bindMouseLook(): void {
    window.addEventListener("mousemove", this._boundMouseLook)
  }

  // ── Visibility ────────────────────────────────────────────────────────────

  debugBones(visible?: boolean): this {
    this.renderer.debugBones(visible)
    return this
  }

  show(): this {
    this.renderer.show()
    return this
  }

  hide(): this {
    this.renderer.hide()
    return this
  }

  destroy(): void {
    window.removeEventListener("mousemove", this._boundMouseLook)
    this.animation.stopLook()
    this.animation.dispose()
    this.audio.dispose()
    this.renderer.dispose()
    this.events.removeAllListeners()
  }

  // ── Position & Size ───────────────────────────────────────────────────────

  move(x: number, y: number): this {
    this.renderer.moveTo(x, y)
    return this
  }

  position(preset: AvatarPosition): this {
    this.renderer.setPosition(preset)
    return this
  }

  scale(factor: number): this {
    const current = parseInt(this.renderer.getContainer().style.width, 10) || this.options.size
    this.renderer.setSize(current * factor)
    return this
  }

  size(px: number): this {
    this.renderer.setSize(px)
    return this
  }

  frame(preset: AvatarFraming): this {
    this.renderer.setFraming(preset)
    return this
  }

  setFramingConfig(config: FramingSliceConfig): this {
    this.renderer.setFramingConfig(config)
    return this
  }

  setTheme(theme: AvatarTheme): this {
    this.renderer.setTheme(theme)
    return this
  }

  setThemeConfig(config: ThemeConfig): this {
    this.renderer.setThemeConfig(config)
    return this
  }

  // ── Expressions ───────────────────────────────────────────────────────────

  expression(expr: Expression, intensity = 1): this {
    this.animation.setExpression(expr, intensity)
    return this
  }

  smile(): this { return this.expression("smile") }
  sad(): this { return this.expression("sad") }
  happy(): this { return this.expression("happy") }
  angry(): this { return this.expression("angry") }
  surprised(): this { return this.expression("surprised") }
  thinking(): this { return this.expression("thinking") }
  confused(): this { return this.expression("confused") }
  sleep(): this { return this.expression("sleep") }
  idle(): this { return this.expression("idle") }

  // ── Gestures ──────────────────────────────────────────────────────────────

  wave(): this { return this._gesture("wave") }
  nod(): this { return this._gesture("nod") }
  shakeHead(): this { return this._gesture("shakeHead") }
  clap(): this { return this._gesture("clap") }
  jump(): this { return this._gesture("jump") }
  dance(): this { return this._gesture("dance") }
  yes(): this { return this._gesture("yes") }
  no(): this { return this._gesture("no") }
  thumbsUp(): this { return this._gesture("thumbsUp") }

  private _gesture(gesture: Gesture): this {
    this.events.emit("animationStart", { gesture })
    this.animation.playGesture(gesture)
    return this
  }

  // ── Look ──────────────────────────────────────────────────────────────────

  lookAtMouse(): this {
    this._bindMouseLook()
    return this
  }

  lookAt(x: number, y: number): this {
    // x/y in screen pixels → normalize to -1..1
    const dx = (x / window.innerWidth) * 2 - 1
    const dy = (y / window.innerHeight) * 2 - 1
    this.animation.lookAt(dx, dy)
    return this
  }

  lookForward(): this {
    window.removeEventListener("mousemove", this._boundMouseLook)
    this.animation.lookForward()
    return this
  }

  randomLook(): this {
    this.animation.startRandomLook()
    return this
  }

  // ── Speech ────────────────────────────────────────────────────────────────

  async talk(audio: AudioBuffer | ArrayBuffer | string): Promise<this> {
    this.events.emit("speechStart")
    if (this.options.lipSync) this.lipSync.startAutoSync()
    await this.audio.play(audio)
    if (this.options.lipSync) this.lipSync.stopAutoSync()
    this.events.emit("speechEnd")
    return this
  }

  startTalking(): this {
    this.events.emit("speechStart")
    if (this.options.lipSync) this.lipSync.startAutoSync()
    return this
  }

  stopTalking(): this {
    this.audio.stop()
    this.lipSync.stopAutoSync()
    this.events.emit("speechEnd")
    return this
  }

  pauseTalking(): this {
    this.audio.pause()
    return this
  }

  // ── Lip Sync ──────────────────────────────────────────────────────────────

  setViseme(viseme: Viseme): this {
    this.lipSync.setViseme(viseme)
    return this
  }

  setMouth(shape: number): this {
    this.lipSync.setMouth(shape)
    return this
  }

  setVolume(volume: number): this {
    this.lipSync.setVolume(volume)
    return this
  }

  // ── States ────────────────────────────────────────────────────────────────

  setState(state: AvatarState): this {
    const config: Record<AvatarState, { expression: Expression; animation: string; ring: string }> = {
      loading:    { expression: "thinking",  animation: "Idle",      ring: "pulse-blue" },
      success:    { expression: "happy",     animation: "Yes",       ring: "pulse-green" },
      error:      { expression: "sad",       animation: "No",        ring: "pulse-red" },
      warning:    { expression: "surprised", animation: "Idle",      ring: "pulse-orange" },
      typing:     { expression: "thinking",  animation: "Idle",      ring: "" },
      listening:  { expression: "smile",     animation: "Idle",      ring: "pulse-blue" },
      processing: { expression: "thinking",  animation: "Idle",      ring: "pulse-blue" },
      complete:   { expression: "happy",     animation: "ThumbsUp",  ring: "pulse-green" },
    }

    const { expression, animation, ring } = config[state]

    this.animation.setExpression(expression)
    this.animation.play(animation)

    const el = this.renderer.getContainer()
    el.dataset["state"] = state
    el.style.setProperty("--ring-color", ring ? (STATE_RING_COLORS[ring] ?? "transparent") : "transparent")

    this.events.emit("animationStart", { state })
    return this
  }

  loading(): this    { return this.setState("loading") }
  success(): this    { return this.setState("success") }
  error(): this      { return this.setState("error") }
  warning(): this    { return this.setState("warning") }
  typing(): this     { return this.setState("typing") }
  listening(): this  { return this.setState("listening") }
  processing(): this { return this.setState("processing") }
  complete(): this   { return this.setState("complete") }

  clearState(): this {
    this.animation.setExpression("idle")
    this.animation.stop()
    const el = this.renderer.getContainer()
    el.dataset["state"] = ""
    el.style.setProperty("--ring-color", "transparent")
    this.events.emit("animationEnd")
    return this
  }

  // ── Animations ────────────────────────────────────────────────────────────

  play(name: string): this {
    this.events.emit("animationStart", { name })
    this.animation.play(name)
    return this
  }

  stop(): this {
    this.animation.stop()
    this.events.emit("animationEnd")
    return this
  }

  // ── Models ────────────────────────────────────────────────────────────────

  async load(model: string): Promise<this> {
    const loaded = await this.loader.load(model)
    this.animation.dispose()
    this.renderer.setModel(loaded.scene)
    this.animation.init(loaded)
    if (this.options.idle) this.animation.startIdle(this.options.idleInterval)
    if (this.options.blink) this.animation.startBlink(this.options.blinkInterval)
    this.events.emit("modelLoaded", { model })
    return this
  }

  // ── Events ────────────────────────────────────────────────────────────────

  on(event: AvatarEvent, callback: AvatarEventCallback): this {
    this.events.on(event, callback)
    return this
  }

  off(event: AvatarEvent, callback: AvatarEventCallback): this {
    this.events.off(event, callback)
    return this
  }

  // ── Plugins ───────────────────────────────────────────────────────────────

  use(plugin: AvatarPlugin, options?: Record<string, unknown>): this {
    this.plugins.use(plugin, this, options)
    return this
  }
}
