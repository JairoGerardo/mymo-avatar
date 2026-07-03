import * as THREE from "three";
import type { AvatarOptions, AvatarPosition, AvatarTheme } from "../types/index.js";
type TickCallback = (delta: number) => void;
export declare class Renderer {
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    private webgl;
    private container;
    private clock;
    private rafId;
    private tickCallbacks;
    private currentModel;
    constructor();
    setup(options: Required<AvatarOptions>): void;
    private _setupLights;
    private _createContainer;
    private _applyTheme;
    private _applyPosition;
    private _startLoop;
    private _makeDraggable;
    addTickCallback(fn: TickCallback): void;
    setModel(model: THREE.Object3D): void;
    private _autoFit;
    show(): void;
    hide(): void;
    setTheme(theme: AvatarTheme): void;
    setPosition(preset: AvatarPosition): void;
    setSize(px: number): void;
    moveTo(x: number, y: number): void;
    getContainer(): HTMLDivElement;
    dispose(): void;
}
export {};
//# sourceMappingURL=Renderer.d.ts.map