import { Application, type ApplicationOptions } from "pixi.js";
import { CAssetLoader } from "./assets";

export interface IEngineOptions {
  /** Canvas parent and resize target; size it via CSS (e.g. inside safe areas). */
  mount: HTMLElement;
  /** Relative URL of the AssetPack manifest, e.g. "assets/manifest.json". */
  manifestUrl: string;
  appOptions?: Partial<ApplicationOptions>;
}

export interface IEngine<K extends string> {
  app: Application;
  assets: CAssetLoader<K>;
}

export async function createEngine<K extends string>(
  options: IEngineOptions,
): Promise<IEngine<K>> {
  const app = new Application();
  await app.init({
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    powerPreference: "high-performance",
    preference: "webgl", // deterministic renderer inside iOS WKWebView
    antialias: false, // sprite-based rendering; not worth the mobile GPU cost
    resizeTo: options.mount,
    ...options.appOptions,
  });
  options.mount.appendChild(app.canvas);

  const assets = await CAssetLoader.init<K>(options.manifestUrl);

  return { app, assets };
}
