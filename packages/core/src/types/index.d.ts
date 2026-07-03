export type AvatarPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type AvatarFraming = "full" | "half" | "bust" | "face";
export type AvatarTheme = "light" | "dark" | "transparent";
export type Expression = "idle" | "smile" | "sad" | "happy" | "angry" | "surprised" | "thinking" | "confused" | "sleep";
export type Gesture = "wave" | "nod" | "yes" | "no" | "shakeHead" | "clap" | "jump" | "dance" | "thumbsUp";
export type AvatarState = "loading" | "success" | "error" | "warning" | "typing" | "listening" | "processing" | "complete";
export type AvatarEvent = "click" | "loaded" | "animationStart" | "animationEnd" | "speechStart" | "speechEnd" | "modelLoaded";
export type AvatarEventCallback = (event: AvatarEvent, data?: unknown) => void;
export interface FramingModeConfig {
    from?: number;
    to?: number;
    lookBias?: number;
}
export type FramingSliceConfig = Partial<Record<AvatarFraming, FramingModeConfig>>;
export interface AvatarOptions {
    model?: string;
    position?: AvatarPosition;
    framing?: AvatarFraming;
    framingConfig?: FramingSliceConfig;
    size?: number;
    theme?: AvatarTheme;
    draggable?: boolean;
    shadows?: boolean;
    idle?: boolean;
    idleInterval?: number;
    blink?: boolean;
    blinkInterval?: number;
    lipSync?: boolean;
    followMouse?: boolean;
    autoHide?: boolean;
    zIndex?: number;
}
export interface AvatarApi {
    on(event: AvatarEvent, callback: AvatarEventCallback): this;
    off(event: AvatarEvent, callback: AvatarEventCallback): this;
    show(): this;
    hide(): this;
    destroy(): void;
    expression(expr: Expression, intensity?: number): this;
    setState(state: AvatarState): this;
    clearState(): this;
    talk(audio: AudioBuffer | ArrayBuffer | string): Promise<this>;
    startTalking(): this;
    stopTalking(): this;
    setViseme(viseme: string): this;
    setVolume(volume: number): this;
    play(name: string): this;
    stop(): this;
    load(model: string): Promise<this>;
}
export interface AvatarPlugin {
    name: string;
    install(avatar: AvatarApi, options?: Record<string, unknown>): void;
}
//# sourceMappingURL=index.d.ts.map