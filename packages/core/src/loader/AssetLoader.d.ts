import * as THREE from "three";
export interface LoadedModel {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
}
export declare class AssetLoader {
    private readonly loader;
    private readonly cache;
    load(modelNameOrUrl: string): Promise<LoadedModel>;
    private _resolve;
    private _loadGLTF;
    clearCache(): void;
}
//# sourceMappingURL=AssetLoader.d.ts.map