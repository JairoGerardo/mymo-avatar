export type AvatarPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left"

export type AvatarFraming = "full" | "half" | "bust" | "face"

export type AvatarTheme = "light" | "dark" | "transparent"

export type Expression =
  | "idle"
  | "smile"
  | "sad"
  | "happy"
  | "angry"
  | "surprised"
  | "thinking"
  | "confused"
  | "sleep"

export type Gesture = "wave" | "nod" | "shakeHead" | "clap" | "jump" | "dance" | "yes" | "no"

export type AvatarState =
  | "loading"
  | "success"
  | "error"
  | "warning"
  | "typing"
  | "listening"
  | "processing"
  | "complete"

export type AvatarEvent =
  | "click"
  | "loaded"
  | "animationStart"
  | "animationEnd"
  | "speechStart"
  | "speechEnd"
  | "modelLoaded"

export type AvatarEventCallback = (event: AvatarEvent, data?: unknown) => void

/** Per-mode framing tuning. from/to: vertical slice of the model (0=feet, 1=top of head).
 *  lookBias: where in the slice the camera aims (0.5=center, lower=more headroom above). */
export interface FramingModeConfig {
  /** Bottom of the visible slice as a fraction of model height (0–1) */
  from?: number
  /** Top of the visible slice as a fraction of model height (0–1, default 1.0) */
  to?: number
  /** Where in the slice the camera aims: 0.5 = center, 0.35 = lower → more room above */
  lookBias?: number
}

export type FramingSliceConfig = Partial<Record<AvatarFraming, FramingModeConfig>>

export interface AvatarOptions {
  model?: string
  position?: AvatarPosition
  size?: number
  theme?: AvatarTheme
  framing?: AvatarFraming
  draggable?: boolean
  shadows?: boolean
  idle?: boolean
  idleInterval?: number
  blink?: boolean
  blinkInterval?: number
  lipSync?: boolean
  followMouse?: boolean
  autoHide?: boolean
  zIndex?: number
  /** Override per-mode framing slices to fine-tune for your specific model */
  framingConfig?: FramingSliceConfig
}

export interface AvatarApi {
  on(event: AvatarEvent, callback: AvatarEventCallback): this
  off(event: AvatarEvent, callback: AvatarEventCallback): this
  show(): this
  hide(): this
  destroy(): void
  expression(expr: Expression, intensity?: number): this
  setState(state: AvatarState): this
  clearState(): this
  talk(audio: AudioBuffer | ArrayBuffer | string): Promise<this>
  startTalking(): this
  stopTalking(): this
  setViseme(viseme: string): this
  setVolume(volume: number): this
  play(name: string): this
  stop(): this
  load(model: string): Promise<this>
  setFramingConfig(config: FramingSliceConfig): this
}

export interface AvatarPlugin {
  name: string
  install(avatar: AvatarApi, options?: Record<string, unknown>): void
}
