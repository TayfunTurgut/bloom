import { Assets, type AssetsManifest } from "pixi.js";

type TManifestAsset = {
  alias: string[];
  src: string[];
  data?: { tags?: { frameNames?: string[] } };
};
type TManifest = { bundles: { name: string; assets: TManifestAsset[] }[] };

/**
 * Loads manifest assets on demand instead of whole bundles.
 *
 * Atlas-page entries in the AssetPack manifest carry `data.tags.frameNames`
 * (written by src/assetpack/atlas.js and spriteSheet.js), so any frame name
 * resolves to the single page that contains it and only that page is fetched
 * and decoded. Loading a page caches every frame under its frame name, so
 * `Assets.get` afterwards works for frames and standalone assets alike.
 */
export class CAssetLoader<K extends string> {
  /** Any usable key (frame name or alias) → the alias to load for it. */
  private readonly keyToAlias = new Map<string, string>();
  private readonly loaded = new Set<string>();

  private constructor(manifest: TManifest) {
    for (const asset of manifest.bundles.flatMap((bundle) => bundle.assets)) {
      const primary = asset.alias[0];
      for (const alias of asset.alias) {
        this.keyToAlias.set(alias, primary);
      }
      for (const frame of asset.data?.tags?.frameNames ?? []) {
        if (!this.keyToAlias.has(frame)) {
          this.keyToAlias.set(frame, primary);
        }
      }
    }
  }

  /**
   * Fetches the manifest and initializes pixi's `Assets`. The manifest URL
   * must be relative (e.g. "assets/manifest.json") so the app works from
   * capacitor:// in WKWebView; asset paths resolve against its directory.
   */
  static async init<K extends string>(
    manifestUrl: string,
  ): Promise<CAssetLoader<K>> {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset manifest at "${manifestUrl}"`);
    }
    const manifest = (await response.json()) as TManifest;
    const basePath = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);
    await Assets.init({ basePath, manifest: manifest as AssetsManifest });
    return new CAssetLoader(manifest);
  }

  /** Loads only the assets/atlas pages needed to resolve the given keys. */
  async load(
    keys: readonly K[],
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const aliases = [...new Set(keys.map((key) => this.aliasOf(key)))].filter(
      (alias) => !this.loaded.has(alias),
    );
    if (aliases.length === 0) {
      onProgress?.(1);
      return;
    }
    await Assets.load(aliases, onProgress);
    for (const alias of aliases) {
      this.loaded.add(alias);
    }
  }

  /** Unloads everything not resolved by `keep` (e.g. between levels). */
  async release(keep: readonly K[]): Promise<void> {
    const keepAliases = new Set(keep.map((key) => this.aliasOf(key)));
    const drop = [...this.loaded].filter((alias) => !keepAliases.has(alias));
    await Assets.unload(drop);
    for (const alias of drop) {
      this.loaded.delete(alias);
    }
  }

  private aliasOf(key: K): string {
    const alias = this.keyToAlias.get(key);
    if (!alias) {
      throw new Error(`Unknown asset key "${key}"`);
    }
    return alias;
  }
}
