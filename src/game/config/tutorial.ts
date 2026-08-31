import { cellIdFromXY } from "../id";
import { levelSchema, type TLevel } from "./schema";
import type { TSkin } from "./skins";

export const TUTORIAL_LEVEL_INDEX = 0;

export const TUTORIAL_STEP_CELLS = {
  plant: cellIdFromXY(1, 1),
  feed: cellIdFromXY(0, 1),
  pop: cellIdFromXY(2, 1),
} as const;

// Piece ids the 6-2-4 deal produces: refills draw the script in order, so the
// plant piece is created first and played first, the 2 sits in front as the
// decoy that forces a swap, and the 4 feeds the plant down to a poppable 2.
export const TUTORIAL_PIECE_IDS = { plant: 1, popper: 2, feeder: 3 } as const;

export const tutorialLevel = (skin: TSkin): TLevel => {
  const crop = skin.crops[0];
  const level: TLevel = {
    data: Array.from({ length: 9 }, () => ({ type: "FILLED" as const })),
    columns: 3,
    goals: [{ type: crop, count: 2 }],
    pieces: [...skin.crops.slice(0, 3)],
    script: [
      { piece: crop, value: 6 },
      { piece: crop, value: 2 },
      { piece: crop, value: 4 },
    ],
  };
  if (import.meta.env.DEV) levelSchema.parse(level);
  return level;
};
