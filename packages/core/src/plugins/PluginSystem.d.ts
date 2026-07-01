import type { AvatarApi, AvatarPlugin } from "../types/index.js";
export declare class PluginSystem {
    private installed;
    use(plugin: AvatarPlugin, avatar: AvatarApi, options?: Record<string, unknown>): void;
    has(name: string): boolean;
}
//# sourceMappingURL=PluginSystem.d.ts.map