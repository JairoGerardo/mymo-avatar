import type { AvatarApi, AvatarPlugin } from "../types/index.js"

export class PluginSystem {
  private installed = new Map<string, AvatarPlugin>()

  use(plugin: AvatarPlugin, avatar: AvatarApi, options?: Record<string, unknown>): void {
    if (this.installed.has(plugin.name)) return
    plugin.install(avatar, options)
    this.installed.set(plugin.name, plugin)
  }

  has(name: string): boolean {
    return this.installed.has(name)
  }
}
