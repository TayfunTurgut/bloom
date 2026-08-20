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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadProfile", () => {
  it("returns an empty profile when nothing is stored", () => {
    stubStorage();
    expect(loadProfile()).toEqual(emptyProfile());
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
      tutorialsSeen: ["welcome", "swap"],
    };
    saveProfile(profile);
    expect(loadProfile()).toEqual(profile);
  });

  it("migrates v2 tutorial indices to lesson ids", () => {
    stubStorage().set(KEY, JSON.stringify(v2Profile([0, 1, 2])));
    const profile = loadProfile();
    expect(profile.version).toBe(PROFILE_VERSION);
    expect(profile.tutorialsSeen).toEqual(["welcome", "feed", "goals"]);
    expect(profile.leaves).toBe(5);
  });

  it("migrates a partial v2 tutorial list", () => {
    stubStorage().set(KEY, JSON.stringify(v2Profile([0])));
    expect(loadProfile().tutorialsSeen).toEqual(["welcome"]);
  });

  it("drops out-of-range v2 tutorial indices", () => {
    stubStorage().set(KEY, JSON.stringify(v2Profile([1, 7])));
    expect(loadProfile().tutorialsSeen).toEqual(["feed"]);
  });

  it("keeps only leaves from a v1 profile", () => {
    stubStorage().set(KEY, JSON.stringify({ version: 1, leaves: 9 }));
    expect(loadProfile()).toEqual({ ...emptyProfile(), leaves: 9 });
  });
});
