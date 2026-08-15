// vitest/config re-exports vite's defineConfig with the `test` block typed.
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { AssetPack } from "@assetpack/core";
import assetpackConfig from "./.assetpack.js";

// Watch mode for `vite dev` only. Production builds run AssetPack via the
// explicit `pnpm assetpack` step instead, because the pipeline regenerates
// src/assetpack/assets.d.ts which tsc and eslint must see before vite build.
function assetpackWatch(): Plugin {
  let assetpack: AssetPack | undefined;
  return {
    name: "assetpack-watch",
    // `vite dev` only. Vitest also runs in serve mode, and letting the asset
    // pipeline rewrite src/assetpack/assets.d.ts during a test run would leave
    // the tree dirty for CI's generated-types check.
    apply: (_config, env) => env.command === "serve" && env.mode !== "test",
    async buildStart() {
      if (assetpack) return;
      assetpack = new AssetPack(assetpackConfig);
      await assetpack.watch();
    },
    async buildEnd() {
      await assetpack?.stop();
      assetpack = undefined;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built app works from capacitor:// in WKWebView.
  base: "./",
  server: {
    port: 8080,
    host: true,
  },
  plugins: [assetpackWatch()],
  // Only the model is tested, and it imports neither pixi nor the DOM, so the
  // node environment is enough — no jsdom, no asset pipeline.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
