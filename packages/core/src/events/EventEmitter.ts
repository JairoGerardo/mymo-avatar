import type { AvatarEvent, AvatarEventCallback } from "../types/index.js"

export class EventEmitter {
  private listeners = new Map<AvatarEvent, Set<AvatarEventCallback>>()

  on(event: AvatarEvent, callback: AvatarEventCallback): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return this
  }

  off(event: AvatarEvent, callback: AvatarEventCallback): this {
    this.listeners.get(event)?.delete(callback)
    return this
  }

  emit(event: AvatarEvent, data?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(event, data))
  }

  removeAllListeners(event?: AvatarEvent): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}
