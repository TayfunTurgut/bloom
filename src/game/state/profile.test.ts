import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emptyProfile,
  loadProfile,
  PROFILE_VERSION,
  saveProfile,
} from "./profile";

const KEY = "sprout:profile";

const stubStorage = () => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  return entries;
};

const v2Profile = (tutorialsSeen: number[]) => ({
  version: 2,
  leaves: 5,
  ownedSkins: ["classic"],
  selectedSkin: "classic",
  tutorialsSeen,
  endless: null,
});

const v3Profile = (tutorialsSeen: string[]) => ({
  version: 3,
  leaves: 7,
  ownedSkins: ["garden", "orchard"],
  selectedSkin: "orchard",
  tutorialsSeen,
  endless: { order: [12, 10, 11], pos: 1 },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadProfile", () => {
  it("returns an empty profile when nothing is stored", () => {
    stubStorage();
    expect(loadProfile()).toEqual(emptyProfile());
  });

  it("starts new players with sound on and the tutorial pending", () => {
    const profile = emptyProfile();
    expect(profile.musicOn).toBe(true);
    expect(profile.sfxOn).toBe(true);
    expect(profile.tutorialDone).toBe(false);
  });

  it("returns an empty profile for garbage", () => {
    stubStorage().set(KEY, "{not json");
    expect(loadProfile()).toEqual(emptyProfile());
  });

  it("round-trips a current profile", () => {
    stubStorage();
    const profile = {
      ...emptyProfile(),
      leaves: 3,
      tutorialDone: true,
      musicOn: false,
      sfxOn: false,
    };
    saveProfile(profile);
    expect(loadProfile()).toEqual(profile);
  });

  it("carries a v3 player's leaves, skins and endless run forward", () => {
    stubStorage().set(KEY, JSON.stringify(v3Profile(["welcome"])));
    const profile = loadProfile();
    expect(profile.version).toBe(PROFILE_VERSION);
    expect(profile.musicOn).toBe(true);
    expect(profile.sfxOn).toBe(true);
    expect(profile.leaves).toBe(7);
    expect(profile.ownedSkins).toEqual(["garden", "orchard"]);
    expect(profile.selectedSkin).toBe("orchard");
    expect(profile.endless).toEqual({ order: [12, 10, 11], pos: 1 });
  });

  it("offers the guided tutorial to a partly taught v3 player", () => {
    // The popup lessons taught swap and goals separately, so seeing one of
    // them is no proof the player learned the rest. The coach only shows on
    // the tutorial level, so offering it again costs a player nothing.
    stubStorage().set(KEY, JSON.stringify(v3Profile(["welcome"])));
    expect(loadProfile().tutorialDone).toBe(false);

    stubStorage().set(KEY, JSON.stringify(v3Profile([])));
    expect(loadProfile().tutorialDone).toBe(false);
  });

  it("migrates a v2 profile the same way", () => {
    stubStorage().set(KEY, JSON.stringify(v2Profile([0, 1])));
    const profile = loadProfile();
    expect(profile.version).toBe(PROFILE_VERSION);
    expect(profile.tutorialDone).toBe(false);
    expect(profile.leaves).toBe(5);
    expect(profile.musicOn).toBe(true);
  });

  it("keeps only leaves from a v1 profile", () => {
    stubStorage().set(KEY, JSON.stringify({ version: 1, leaves: 9 }));
    expect(loadProfile()).toEqual({ ...emptyProfile(), leaves: 9 });
  });
});
