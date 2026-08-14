import { defineConfig, type Plugin } from "vite";
import { AssetPack } from "@assetpack/core";
import assetpackConfig from "./.assetpack.js";

// Watch mode for `vite dev` only. Production builds run AssetPack via the
// explicit `pnpm assetpack` step instead, because the pipeline regenerates
// src/assetpack/assets.d.ts which tsc and eslint must see before vite build.
function assetpackWatch(): Plugin {
  let assetpack: AssetPack | undefined;
  return {
    name: "assetpack-watch",
    apply: "serve",
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
});
