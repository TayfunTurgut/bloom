import {
  TUTORIAL_LEVEL_INDEX,
  TUTORIAL_PIECE_IDS,
  TUTORIAL_STEP_CELLS,
} from "../config/tutorial";
import type { CellId } from "../id";
import type { TGameState } from "./types";

export type TTutorialAction = { kind: "place"; cell: CellId };

export type TTutorialView = {
  step: 1 | 2 | 3;
  action: TTutorialAction;
  hint: string;
};

const TUTORIAL_MOVES = 3;

const view = (
  step: TTutorialView["step"],
  action: TTutorialAction,
  hint: string,
): TTutorialView => ({ step, action, hint });

const place = (cell: CellId): TTutorialAction => ({ kind: "place", cell });

const rightmostId = (state: TGameState): number | undefined =>
  state.tray[state.tray.length - 1]?.id;

// Derives the current step from observable state alone (move count and the
// rightmost tray piece), so a restored save resumes mid-tutorial.
export const tutorialView = (state: TGameState): TTutorialView | null => {
  if (state.level !== TUTORIAL_LEVEL_INDEX) return null;
  if (state.moves >= TUTORIAL_MOVES) return null;

  if (state.moves === 0) {
    if (rightmostId(state) !== TUTORIAL_PIECE_IDS.plant) return null;
    return view(
      1,
      place(TUTORIAL_STEP_CELLS.plant),
      "Tap the glowing tile to plant a crop.",
    );
  }

  if (state.moves === 1) {
    if (rightmostId(state) !== TUTORIAL_PIECE_IDS.feeder) return null;
    return view(
      2,
      place(TUTORIAL_STEP_CELLS.feed),
      "Plant next to your crop to feed it.",
    );
  }

  if (rightmostId(state) !== TUTORIAL_PIECE_IDS.popper) return null;
  return view(
    3,
    place(TUTORIAL_STEP_CELLS.pop),
    "Feed it down to zero to harvest it!",
  );
};

export const isTutorialComplete = (state: TGameState): boolean =>
  state.level === TUTORIAL_LEVEL_INDEX && state.moves >= TUTORIAL_MOVES;

export const actionAllowed = (
  current: TTutorialView | null,
  action: TTutorialAction,
): boolean => {
  if (!current) return true;
  return action.cell === current.action.cell;
};
