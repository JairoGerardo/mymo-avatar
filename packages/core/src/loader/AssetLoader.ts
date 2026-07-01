import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import { VRMLoaderPlugin, type VRM } from "@pixiv/three-vrm"

export interface LoadedModel {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
  vrm?: VRM
}

const MODEL_CDN = "https://cdn.jsdelivr.net/npm/@mymo"

export class AssetLoader {
  private readonly cache = new Map<string, LoadedModel>()

  async load(modelNameOrUrl: string): Promise<LoadedModel> {
    const url = this._resolve(modelNameOrUrl)

    const cached = this.cache.get(url)
    if (cached) return cached

    const isVRM = url.endsWith(".vrm")
    const model = isVRM ? await this._loadVRM(url) : await this._loadGLB(url)

    this.cache.set(url, model)
    return model
  }

  private _resolve(nameOrUrl: string): string {
    if (nameOrUrl.startsWith("http") || nameOrUrl.startsWith("/") || nameOrUrl.endsWith(".glb") || nameOrUrl.endsWith(".vrm")) {
      return nameOrUrl
    }
    return `${MODEL_CDN}/model-${nameOrUrl}/latest/${nameOrUrl}.glb`
  }

  private async _loadGLB(url: string): Promise<LoadedModel> {
    const loader = new GLTFLoader()
    const gltf = await this._load(loader, url)
    this._prepareMeshes(gltf.scene)
    return { scene: gltf.scene, animations: gltf.animations }
  }

  private async _loadVRM(url: string): Promise<LoadedModel> {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    const gltf = await this._load(loader, url)
    const vrm = gltf.userData["vrm"] as VRM
    this._prepareMeshes(vrm.scene)
    return { scene: vrm.scene, animations: gltf.animations, vrm }
  }

  private _prepareMeshes(scene: THREE.Group): void {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
        if (obj.morphTargetInfluences) obj.morphTargetInfluences.fill(0)
      }
    })
  }

  private _load(loader: GLTFLoader, url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, (err) =>
        reject(new Error(`Failed to load model: ${url} — ${String(err)}`))
      )
    })
  }

  clearCache(): void {
    this.cache.clear()
  }
}
