// Importing @pixi/sound registers its Assets loader, so the manifest's audio
// entries resolve to Sound instances. Keep this the only module touching it.
import { sound, type Sound } from "@pixi/sound";
import type { AssetKey } from "../assetpack/assets";
import { getAsset } from "./assets";

// The music track is much larger than the effects, so it loads in the
// background after startup while the short effects gate the loading bar.
export const SFX_ASSET_KEYS = [
  "pop",
  "match",
  "swap",
  "win",
  "fail",
] as const satisfies readonly AssetKey[];

export const MUSIC_ASSET_KEY = "music" satisfies AssetKey;

export type TSfxName = (typeof SFX_ASSET_KEYS)[number];

export type TSoundPrefs = { musicOn: boolean; sfxOn: boolean };

const MUSIC_VOLUME = 0.35;

let prefs: () => TSoundPrefs = () => ({ musicOn: true, sfxOn: true });

export const initSound = (getPrefs: () => TSoundPrefs) => {
  prefs = getPrefs;
};

export const sfx = (name: TSfxName) => {
  if (!prefs().sfxOn) return;
  void getAsset<Sound>(name).play();
};

export const music = {
  start() {
    if (!prefs().musicOn) return;
    const track = getAsset<Sound | undefined>(MUSIC_ASSET_KEY);
    if (track && !track.isPlaying)
      void track.play({ loop: true, volume: MUSIC_VOLUME });
  },
  stop() {
    getAsset<Sound | undefined>(MUSIC_ASSET_KEY)?.stop();
  },
  /** Starts or stops the track to match the current preference. */
  sync() {
    if (prefs().musicOn) music.start();
    else music.stop();
  },
};

export const suspendAudio = () => sound.pauseAll();
export const resumeAudio = () => sound.resumeAll();
