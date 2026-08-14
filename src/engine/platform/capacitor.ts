import type { Application } from "pixi.js";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";

/** Native-shell setup; no-op when running in a plain browser. */
export async function initPlatform(app: Application): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (Capacitor.getPlatform() === "ios") {
    await StatusBar.hide();
  }

  await App.addListener("pause", () => app.ticker.stop());
  await App.addListener("resume", () => app.ticker.start());

  // When audio lands (@pixi/sound), resume its AudioContext here on the
  // first pointerdown — iOS keeps WebAudio suspended until a user gesture.
}

/** Hides the native splash screen; call once the first scene can render. */
export async function notifySceneReady(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  await SplashScreen.hide();
}
