import { Application, type ApplicationOptions } from "pixi.js";
import { CAssetLoader } from "./assets";

export interface IEngineOptions {
  mount: HTMLElement;
  basePath: string;
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
    preference: "webgl",
    antialias: false,
    resizeTo: options.mount,
    ...options.appOptions,
  });
  options.mount.appendChild(app.canvas);

  const assets = new CAssetLoader<K>();
  await assets.init(options.basePath, options.manifestUrl);

  return { app, assets };
}
