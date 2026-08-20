import { describe, expect, it } from "vitest";
import { EASY_LEVELS, generateLevel, tierForIndex } from "./generate";
import { DEFAULT_SKIN_ID, SKINS, skinById } from "./skins";
import { levelSchema } from "./schema";

const skin = skinById(DEFAULT_SKIN_ID);

describe("generateLevel", () => {
  it("is deterministic for a given index and skin", () => {
    expect(generateLevel(42, skin)).toEqual(generateLevel(42, skin));
    expect(generateLevel(7, skin)).toEqual(generateLevel(7, skin));
  });

  it("produces schema-valid levels across the ladder", () => {
    for (const index of [0, 5, 9, 10, 60, 200, 500, 999]) {
      expect(levelSchema.safeParse(generateLevel(index, skin)).success).toBe(
        true,
      );
    }
  });

  it("keeps the first ten levels on the easiest tier, then ramps", () => {
    for (let index = 0; index < EASY_LEVELS; index++) {
      expect(tierForIndex(index)).toBe(0);
    }
    expect(tierForIndex(EASY_LEVELS)).toBeGreaterThan(0);
    expect(tierForIndex(999)).toBeGreaterThan(tierForIndex(EASY_LEVELS));
  });

  it("draws every goal and pool crop from the active skin", () => {
    const set = new Set(skin.crops);
    for (const index of [0, 15, 120, 640]) {
      const level = generateLevel(index, skin);
      expect(level.pieces.every((key) => set.has(key))).toBe(true);
      expect(level.goals.every((goal) => set.has(goal.type))).toBe(true);
      expect(
        level.goals.every((goal) => level.pieces.includes(goal.type)),
      ).toBe(true);
    }
  });

  it("gives every skin a full palette of distinct crops", () => {
    for (const candidate of SKINS) {
      expect(new Set(candidate.crops).size).toBe(candidate.crops.length);
    }
  });
});
