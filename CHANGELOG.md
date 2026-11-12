# Changelog

All notable changes to Sprout are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses
[semantic versioning](https://semver.org/).

## [1.2.0] — 2026-11-12

### Changed

- Play is tap-only: the tray's swap button is gone. The tray still shows the
  next crop and the two after it. The guided first level now teaches planting,
  feeding and harvesting in three taps.
- The launch screen is the app icon on grass green, in place of the default
  white Capacitor splash; the web view and canvas use the same green while the
  game loads.
- Crops grow out of the soil when placed, tiles dip under the finger, and a tap
  on a taken tile makes its crop shake.
- The tray queue slides along, goal counts and leaf pips pop, the score ring
  fills smoothly, and harvests in a chain rise in pitch.
- The result screen fades in, ignores taps for its first moment and shows "Tap
  to continue".
- Goals sit evenly around the score ring when a level has fewer than four.

### Fixed

- Bold text uses the bold Baloo face; the browser was faking it from the
  regular one.
- Piece values stay sharp on small boards.

## [1.1.0] — 2026-08-31

### Added

- Music and sound effects, each with its own toggle in a new **Settings** tab
  of the redesigned settings window (which also gains **Skins** and **Credits**
  tabs).
- A guided first level that walks new players through planting, swapping,
  feeding and harvesting, in place of the old coaching pop-ups.
- **Rocks** on later levels: a crop can start pinned under a rock, which stops
  it being fed until an adjacent crop is harvested to break the rock free.
- A highlight on the tray marking the crop that will be placed next.

### Changed

- Placement no longer waits for its own animation — crops can be placed back to
  back; only a harvest holds input.
- Early levels use smaller boards.
- Faster tray and feed animations.

### Fixed

- The top bar no longer slips under the notch or Dynamic Island. The game reads
  the device's safe-area insets and keeps its content clear of them, while the
  background fills the whole screen.

### Notes

- Saved progress, leaves and skins from 1.0.0 carry over.

## [1.0.0] — 2026-08-21

- Initial App Store release.
