import type { TConfig } from "../config/schema";
import { cellIdFromXY, type CellId } from "../id";
import { nextFrom, nextInt, randomSeed } from "./rng";
import type { TGameState, TGoal, TPiece } from "./types";

export type TLevel = TConfig["levels"][number];

export const TRAY_SIZE = 3;
// Balance knobs for the number printed on a drawn flower. The max doubles as
// the bound on how far one placement can drive a neighbour negative, which is
// why the save schema leaves currentValue unbounded.
export const PIECE_VALUE_MIN = 1;
export const PIECE_VALUE_MAX = 12;

/** A fresh game of `level`, tray already filled. */
export const createInitialState = (
  levelIndex: number,
  level: TLevel,
  seed: number = randomSeed(),
): TGameState => {
  const columns = level.columns;
  const rows = level.data.length / columns;

  const board = new Map<CellId, TPiece | null>();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      // A hole is left out of the map rather than marked in it. canPlace
      // already tests `has` and neighborsOf already drops nullish lookups, so
      // absence is all it takes to make a hole unplayable and un-adjacent.
      if (level.data[y * columns + x].type === "EMPTY") continue;
      board.set(cellIdFromXY(x, y), null);
    }
  }

  const state: TGameState = {
    level: levelIndex,
    moves: 0,
    score: 0,
    rows,
    columns,
    pieces: level.pieces,
    rng: seed,
    nextPieceId: 1,
    goals: level.goals.map((goal) => ({
      type: goal.type,
      target: goal.count,
      progress: 0,
    })),
    board,
    tray: [],
  };
  refillTray(state);
  return state;
};

export const canPlace = (state: TGameState, x: number, y: number): boolean => {
  const cellId = cellIdFromXY(x, y);
  return (
    state.board.has(cellId) &&
    state.board.get(cellId) === null &&
    state.tray.length > 0
  );
};

/**
 * Takes the front piece off the tray onto the cell at (x, y) and settles
 * everything that follows from it: supply drain, move counter, goal progress,
 * refill. One placement is one atomic change to the state.
 *
 * Returns false and leaves the state untouched when the move is not legal.
 */
export const placeFromTray = (
  state: TGameState,
  x: number,
  y: number,
): boolean => {
  if (!canPlace(state, x, y)) return false;
  const piece = state.tray.pop();
  if (!piece) return false;

  state.board.set(cellIdFromXY(x, y), piece);

  const neighbors = neighborsOf(state, x, y);
  if (neighbors.length > 0) {
    piece.type = "SUPPLY";

    const targetPiece = neighbors.reduce((a, b) =>
      a.currentValue > b.currentValue ? a : b,
    );
    targetPiece.currentValue -= piece.currentValue;
  }

  state.moves += 1;
  advanceGoals(state, piece);
  refillTray(state);
  return true;
};

/** Tops the tray back up to TRAY_SIZE, newest arrivals entering on the left. */
export const refillTray = (state: TGameState) => {
  while (state.tray.length < TRAY_SIZE) {
    state.tray.unshift(createPiece(state));
  }
};

export const goalRemaining = (goal: TGoal): number =>
  Math.max(0, goal.target - goal.progress);

export const isGoalComplete = (goal: TGoal): boolean =>
  goal.progress >= goal.target;

const createPiece = (state: TGameState): TPiece => {
  const value = nextInt(state, PIECE_VALUE_MIN, PIECE_VALUE_MAX);
  return {
    id: state.nextPieceId++,
    assetKey: nextFrom(state, state.pieces),
    type: "BLOOM",
    startingValue: value,
    currentValue: value,
  };
};

// Order is load-bearing, not cosmetic: placeFromTray picks the drain target
// with a `>` reduce, which keeps the later of two equal values, so a tie
// resolves to whichever cell is last here — today, the one above. Reordering
// this list changes which flower drains.
const neighborsOf = (state: TGameState, x: number, y: number): TPiece[] => {
  const candidates = [
    state.board.get(cellIdFromXY(x + 1, y)),
    state.board.get(cellIdFromXY(x, y + 1)),
    state.board.get(cellIdFromXY(x - 1, y)),
    state.board.get(cellIdFromXY(x, y - 1)),
  ];
  return candidates.filter((c): c is TPiece => c != null);
};

// A placement advances every goal whose type matches the art of the flower
// just placed, by one, regardless of whether it landed as a bloom or a
// supply — the goal panel shows a flower and a count, so "place that many of
// this flower" is what the player reads off it. Clamped at the target so an
// already-complete goal cannot overshoot and drive the remaining count
// negative.
const advanceGoals = (state: TGameState, piece: TPiece) => {
  for (const goal of state.goals) {
    if (goal.type !== piece.assetKey) continue;
    goal.progress = Math.min(goal.target, goal.progress + 1);
  }
};
