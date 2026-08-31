import { Capacitor } from "@capacitor/core";
import { SafeArea } from "capacitor-plugin-safe-area";
import type { TInsets } from "../fit";

// The native plugin reads view.safeAreaInsets, which stays correct on iOS
// even with the status bar hidden — where env(safe-area-inset-top) reads 0.
export async function getSafeAreaInsets(): Promise<TInsets> {
  const dev = devInsets();
  if (dev) return dev;
  if (Capacitor.isNativePlatform()) {
    const { insets } = await SafeArea.getSafeAreaInsets();
    return insets;
  }
  return cssEnvInsets();
}

export function onSafeAreaChange(callback: (insets: TInsets) => void): void {
  if (devInsets()) return;
  if (Capacitor.isNativePlatform()) {
    void SafeArea.addListener("safeAreaChanged", ({ insets }) =>
      callback(insets),
    );
    return;
  }
  window.addEventListener("orientationchange", () => callback(cssEnvInsets()));
}

function cssEnvInsets(): TInsets {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top) env(safe-area-inset-right) " +
    "env(safe-area-inset-bottom) env(safe-area-inset-left);";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

function devInsets(): TInsets | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get("safearea");
  if (value === null) return null;
  const [top = 0, right = 0, bottom = 0, left = 0] = value
    .split(",")
    .map((part) => Number(part) || 0);
  return { top, right, bottom, left };
}
