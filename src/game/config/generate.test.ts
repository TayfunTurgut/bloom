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

  it("keeps the easiest tier on small boards", () => {
    for (let index = 0; index < EASY_LEVELS; index++) {
      const level = generateLevel(index, skin);
      const rows = level.data.length / level.columns;
      expect(level.columns).toBeLessThanOrEqual(4);
      expect(rows).toBeLessThanOrEqual(4);
    }
  });
});

describe("rocked generation", () => {
  const rockedIndices = (level: ReturnType<typeof generateLevel>) =>
    level.data.flatMap((cell, index) => (cell.rocked ? [index] : []));

  const neighborsOf = (
    index: number,
    columns: number,
    total: number,
  ): number[] => {
    const x = index % columns;
    const y = Math.floor(index / columns);
    const rows = total / columns;
    const found: number[] = [];
    if (x > 0) found.push(index - 1);
    if (x < columns - 1) found.push(index + 1);
    if (y > 0) found.push(index - columns);
    if (y < rows - 1) found.push(index + columns);
    return found;
  };

  it("leaves the first two tiers rock-free", () => {
    for (const index of [0, 3, 9, 10, 35, 69]) {
      expect(rockedIndices(generateLevel(index, skin))).toEqual([]);
    }
  });

  it("seeds one to three well-formed rocks from the third tier up", () => {
    let total = 0;
    for (let index = 70; index < 1000; index += 37) {
      const level = generateLevel(index, skin);
      const rocks = rockedIndices(level);
      total += rocks.length;
      expect(rocks.length).toBeLessThanOrEqual(3);

      for (const rock of rocks) {
        const cell = level.data[rock];
        expect(cell.type).toBe("FILLED");
        expect(cell.piece).toBeDefined();
        expect(level.pieces).toContain(cell.piece);
        expect(cell.value).toBeGreaterThanOrEqual(2);
        expect(cell.value).toBeLessThanOrEqual(6);
      }

      const rockSet = new Set(rocks);
      const playable = (i: number) =>
        level.data[i].type === "FILLED" && !rockSet.has(i);
      for (const rock of rocks) {
        const near = neighborsOf(rock, level.columns, level.data.length);
        expect(near.some((i) => rockSet.has(i))).toBe(false);
        expect(
          near.some(
            (j) =>
              playable(j) &&
              neighborsOf(j, level.columns, level.data.length).some(
                (k) => k !== rock && playable(k),
              ),
          ),
        ).toBe(true);
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it("deals the same rocks for the same index", () => {
    expect(generateLevel(200, skin)).toEqual(generateLevel(200, skin));
  });
});
