import type { AvatarEvent, AvatarEventCallback } from "../types/index.js";
export declare class EventEmitter {
    private listeners;
    on(event: AvatarEvent, callback: AvatarEventCallback): this;
    off(event: AvatarEvent, callback: AvatarEventCallback): this;
    emit(event: AvatarEvent, data?: unknown): void;
    removeAllListeners(event?: AvatarEvent): void;
}
//# sourceMappingURL=EventEmitter.d.ts.map