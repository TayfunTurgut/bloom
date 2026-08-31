import type { Application } from "pixi.js";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";

export async function initPlatform(
  app: Application,
  hooks?: { onPause?: () => void; onResume?: () => void },
) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (Capacitor.getPlatform() === "ios") {
    await StatusBar.hide();
  }

  await App.addListener("pause", () => {
    app.ticker.stop();
    hooks?.onPause?.();
  });
  await App.addListener("resume", () => {
    app.ticker.start();
    hooks?.onResume?.();
  });
}

export async function notifySceneReady() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  await SplashScreen.hide();
}
