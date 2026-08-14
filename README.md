# Bloom

A PixiJS v8 puzzle game, packaged with Capacitor 8 for iPhone and iPad (iOS 15+).

## Structure

- `src/engine/` — reusable, game-agnostic: app bootstrap (`createEngine`), typed
  `Container` wrapper, on-demand manifest asset loader, resize/storage helpers,
  Capacitor platform glue. Future games build on this.
- `src/game/` — Bloom-specific: components, controller, level config, save state.
- `src/assetpack/` — build-time AssetPack pipes + the generated `assets.d.ts` key union.
- `src/assets/` — raw art/fonts (input); `public/assets/` is generated output (git-ignored).
- `ios/` — Capacitor-generated Xcode project (SPM-based; committed).

## Develop

```bash
pnpm install
pnpm dev        # vite dev server on :8080; AssetPack watches src/assets/
```

`pnpm build` runs `assetpack → eslint → tsc → vite build` — the order matters because
AssetPack regenerates `src/assetpack/assets.d.ts`, which lint and tsc consume.

## iOS (requires macOS + Xcode 26+)

```bash
pnpm ios:sync   # build web + copy into ios/ — rerun after EVERY web change
pnpm ios:open   # open the Xcode workspace
```

In Xcode: select your signing team; bundle id is `com.tayfunturgut.bloom`
(must match App Store Connect); Deployment Target is iOS 15.0.

App icons/splash: put a 1024×1024 `assets/icon.png` (and optional 2732×2732
`assets/splash.png` / `splash-dark.png`) at the repo root, then run
`npx @capacitor/assets generate --ios`.

Release: choose "Any iOS Device (arm64)" → Product ▸ Archive → Distribute App ▸
App Store Connect. iPad is a separate review surface — test and screenshot both
device families (or declare iPhone-only).

Device smoke checklist: splash → progress bar → board; status bar hidden; safe
areas respected (notch + home indicator, both orientations); taps place pieces;
backgrounding pauses the ticker; memory well under ~300 MB in Xcode's gauge.
