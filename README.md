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
pnpm ios:open   # open the Xcode project (SPM template — there is no .xcworkspace)
```

In Xcode: select your signing team; bundle id is `com.tayfunturgut.bloom`
(must match App Store Connect); Deployment Target is iOS 15.0.

App icons/splash: put a 1024×1024 `assets/icon.png` (and optional 2732×2732
`assets/splash.png` / `splash-dark.png`) at the repo root, then run
`npx @capacitor/assets generate --ios`.

## Versioning

`package.json` is the source of truth for the marketing version. Bump it, then
run `pnpm run version:sync` (or just `pnpm ios:sync`, which runs it) to write
`MARKETING_VERSION` into `project.pbxproj`, and commit both. CI fails if the two
disagree, and a `v*` release tag must match `package.json` exactly.

Must be one to three dot-separated integers — App Store Connect rejects semver
prerelease suffixes like `1.0.0-beta.1`.

Build numbers (`CURRENT_PROJECT_VERSION`) are not tracked in the repo: the
release workflow sets one from the CI run number, which is monotonic, so
re-archiving a version never collides in App Store Connect. Bump it by hand if
you archive locally.

## Release

CI (`.github/workflows/release-ios.yml`) archives, signs and uploads on a `v*`
tag, given the Apple signing and App Store Connect secrets listed at the top of
that file. To do it by hand instead: choose "Any iOS Device (arm64)" → Product ▸
Archive → Distribute App ▸ App Store Connect. iPad is a separate review surface
— test and screenshot both device families (or declare iPhone-only).

Device smoke checklist: splash → progress bar → board; status bar hidden; safe
areas respected (notch + home indicator, both orientations); taps place pieces;
backgrounding pauses the ticker; memory well under ~300 MB in Xcode's gauge.
