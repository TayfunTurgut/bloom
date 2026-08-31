// Importing @pixi/sound registers its Assets loader, so the manifest's audio
// entries resolve to Sound instances. Keep this the only module touching it.
import { sound, type Sound } from "@pixi/sound";
import type { AssetKey } from "../assetpack/assets";
import { getAsset } from "./assets";

export const AUDIO_ASSET_KEYS = [
  "music",
  "pop",
  "match",
  "swap",
  "win",
  "fail",
] as const satisfies readonly AssetKey[];

export type TSfxName = Exclude<(typeof AUDIO_ASSET_KEYS)[number], "music">;

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
    const track = getAsset<Sound>("music");
    if (!track.isPlaying) void track.play({ loop: true, volume: MUSIC_VOLUME });
  },
  stop() {
    getAsset<Sound>("music").stop();
  },
  setEnabled(on: boolean) {
    if (on) music.start();
    else music.stop();
  },
};

export const suspendAudio = () => sound.pauseAll();
export const resumeAudio = () => sound.resumeAll();
