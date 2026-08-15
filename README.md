# Bloom

A PixiJS v8 puzzle game, packaged with Capacitor 8 for iPhone and iPad (iOS 15+).

## Structure

- `src/engine/` — reusable, game-agnostic: app bootstrap (`createEngine`), typed
  `Container` wrapper, observable `CStore`, on-demand manifest asset loader,
  resize/storage helpers, Capacitor platform glue. Future games build on this.
- `src/game/model/` — the single source of truth: `TGameState` (board, tray,
  goals, score) as plain data, the rules that change it, and snapshot
  serialization. No pixi imports, so it is directly unit-testable.
- `src/game/` — the rest of Bloom: components, controller, level config, save state.
- `src/assetpack/` — build-time AssetPack pipes + the generated `assets.d.ts` key union.
- `src/assets/` — raw art/fonts (input); `public/assets/` is generated output (git-ignored).
- `ios/` — Capacitor-generated Xcode project (SPM-based; committed).

## Layered cells

A board cell is a stack, bottom to top: a flower and any covers over it. Each
cover kind has one entry in `LAYER_BEHAVIORS` (`model/layers.ts`) declaring
whether it blocks placement, whether it hides what it covers, which triggers it
wants, and a pure `react` returning an outcome — damage, clear, replace, or
nothing. A vine thins when the player plays beside it; a stone slab erodes once
per move wherever they play.

That registry is a lookup table, deliberately not a subscription list. Ordering
lives in `resolveLayers` (`model/resolve.ts`), which walks a fixed phase order
and dispatches only to each cell's topmost layer, so resolution is
deterministic and testable rather than dependent on the order listeners
happened to attach.

A move returns a `TMoveReport`: an ordered log of what happened. The state is
still the whole truth of what the board _is_, and the views redraw from it
alone; the report carries only the sequence, which a re-render cannot recover,
and only `components/fx.ts` reads it. Adding a cover kind means adding to
`LAYER_BEHAVIORS` and `LAYER_VISUALS`, and TypeScript names both until you have.

## Develop

```bash
pnpm install
pnpm dev        # vite dev server on :8080; AssetPack watches src/assets/
```

`pnpm build` runs `assetpack → prettier → eslint → tsc → vite build` — the order
matters because AssetPack regenerates `src/assetpack/assets.d.ts`, which the
format, lint and tsc steps all consume.

`pnpm verify` runs just the checks (`format:check → lint → typecheck → test`),
skipping AssetPack and the bundle. `pnpm install` points `core.hooksPath` at
`.githooks/`, whose `pre-commit` runs `pnpm verify` — so a commit that is
misformatted, fails lint, fails to typecheck or breaks a test is rejected.
Bypass a single commit with `git commit --no-verify`.

`pnpm test` (vitest) covers the pure layers: `src/game/model/`, the level schema
in `src/game/config/`, and the engine's store and storage helpers. None of them
need a browser or the art pipeline — the one suite that wants `localStorage`
stubs it — so they run in the node environment in well under a second.

The hook checks the whole project, not just staged files: tsc and eslint are
project-wide by nature. It deliberately does not run AssetPack, so if you change
`src/assets/` remember `pnpm assetpack` — CI verifies `assets.d.ts` is current.

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
