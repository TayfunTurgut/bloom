import { describe, expect, it } from "vitest";
import { levelSchema } from "./schema";
import { SKINS } from "./skins";
import { generateLevel, levelFor } from "./generate";
import {
  TUTORIAL_LEVEL_INDEX,
  TUTORIAL_STEP_CELLS,
  tutorialLevel,
} from "./tutorial";
import { xyFromCellId } from "../id";

describe("tutorialLevel", () => {
  it("builds a valid 3x3 level for every skin", () => {
    for (const skin of SKINS) {
      const level = tutorialLevel(skin);
      expect(levelSchema.safeParse(level).success).toBe(true);
      expect(level.columns).toBe(3);
      expect(level.data).toHaveLength(9);
      expect(level.data.every((cell) => cell.type === "FILLED")).toBe(true);
    }
  });

  it("scripts three pieces of the goal crop with the 6-4-2 deal", () => {
    const level = tutorialLevel(SKINS[0]);

    expect(level.goals).toEqual([{ type: SKINS[0].crops[0], count: 2 }]);
    expect(level.script?.map((entry) => entry.piece)).toEqual(
      Array.from({ length: 3 }, () => SKINS[0].crops[0]),
    );
    expect(level.script?.map((entry) => entry.value)).toEqual([6, 4, 2]);
  });

  it("keeps its step cells on the board", () => {
    for (const cell of Object.values(TUTORIAL_STEP_CELLS)) {
      const { x, y } = xyFromCellId(cell);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(3);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(3);
    }
  });
});

describe("levelFor", () => {
  it("serves the tutorial level at index 0 and generates the rest", () => {
    const skin = SKINS[0];

    expect(levelFor(TUTORIAL_LEVEL_INDEX, skin)).toEqual(tutorialLevel(skin));
    expect(levelFor(1, skin)).toEqual(generateLevel(1, skin));
    expect(levelFor(1, skin).script).toBeUndefined();
  });
});
