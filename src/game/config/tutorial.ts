import { cellIdFromXY } from "../id";
import { levelSchema, type TLevel } from "./schema";
import type { TSkin } from "./skins";

export const TUTORIAL_LEVEL_INDEX = 0;

export const TUTORIAL_STEP_CELLS = {
  plant: cellIdFromXY(1, 1),
  feed: cellIdFromXY(0, 1),
  pop: cellIdFromXY(2, 1),
} as const;

// Piece ids the 6-4-2 deal produces: refills draw the script in order and the
// tray plays them in that order, so the 6 is planted, the 4 feeds it down to
// 2, and the 2 pops it.
export const TUTORIAL_PIECE_IDS = { plant: 1, feeder: 2, popper: 3 } as const;

export const tutorialLevel = (skin: TSkin): TLevel => {
  const crop = skin.crops[0];
  const level: TLevel = {
    data: Array.from({ length: 9 }, () => ({ type: "FILLED" as const })),
    columns: 3,
    goals: [{ type: crop, count: 2 }],
    pieces: [...skin.crops.slice(0, 3)],
    script: [
      { piece: crop, value: 6 },
      { piece: crop, value: 4 },
      { piece: crop, value: 2 },
    ],
  };
  if (import.meta.env.DEV) levelSchema.parse(level);
  return level;
};
