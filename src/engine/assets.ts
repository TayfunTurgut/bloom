import { Assets } from "pixi.js";

export class CAssetLoader<K extends string> {
  async init(basePath: string, manifestUrl: string) {
    return Assets.init({ basePath, manifest: manifestUrl });
  }

  async load<T>(
    keys: K | readonly K[],
    onProgress?: (progress: number) => void,
  ) {
    return Assets.load<T>(keys, onProgress);
  }
}
