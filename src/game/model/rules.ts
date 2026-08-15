import type { TConfig } from "../config/schema";
import { cellIdFromXY, type CellId } from "../id";
import {
  blocksAdjacency,
  blocksPlacement,
  createLayer,
  createPieceLayer,
  pieceIn,
} from "./layers";
import { resolveLayers, type TEffect, type TMoveReport } from "./resolve";
import { nextFrom, nextInt, randomSeed } from "./rng";
import type { TCell, TGameState, TGoal, TPiece } from "./types";

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

  const state: TGameState = {
    level: levelIndex,
    moves: 0,
    score: 0,
    rows,
    columns,
    pieces: level.pieces,
    rng: seed,
    nextPieceId: 1,
    nextLayerId: 1,
    goals: level.goals.map((goal) => ({
      type: goal.type,
      target: goal.count,
      progress: 0,
    })),
    board: new Map(),
    tray: [],
  };

  // Filled after the state literal rather than before it, because building a
  // cell's stack draws ids off state.nextLayerId and values off state.rng.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const spec = level.data[y * columns + x];
      // A hole is left out of the map rather than marked in it. canPlace
      // already tests `has` and neighborsOf already drops nullish lookups, so
      // absence is all it takes to make a hole unplayable and un-adjacent.
      if (spec.type === "EMPTY") continue;

      const cell: TCell = { layers: [] };
      // Bottom to top: the authored flower first, then its covers, so what the
      // level file reads like top to bottom is what the player peels off.
      if (spec.piece) {
        cell.layers.push(
          createPieceLayer(state, createPiece(state, spec.piece)),
        );
      }
      for (const blocker of spec.layers) {
        cell.layers.push(createLayer(state, blocker));
      }
      state.board.set(cellIdFromXY(x, y), cell);
    }
  }

  refillTray(state);
  return state;
};

/**
 * The single gate every placement passes: the cell has to exist, and nothing
 * already in its stack may block a placement — which covers both an occupied
 * cell (the PIECE layer blocks) and a covered one (the blocker does).
 */
export const canPlace = (state: TGameState, x: number, y: number): boolean => {
  const cell = state.board.get(cellIdFromXY(x, y));
  return cell !== undefined && !blocksPlacement(cell) && state.tray.length > 0;
};

/**
 * Takes the front piece off the tray onto the cell at (x, y) and settles
 * everything that follows from it: supply drain, layer resolution, move
 * counter, goal progress, refill. One placement is one atomic change to the
 * state.
 *
 * Returns null and leaves the state untouched when the move is not legal.
 * Otherwise returns an ordered account of everything that happened, for the
 * view to replay as effects — see resolve.ts.
 */
export const placeFromTray = (
  state: TGameState,
  x: number,
  y: number,
): TMoveReport | null => {
  if (!canPlace(state, x, y)) return null;
  const piece = state.tray.pop();
  if (!piece) return null;

  const cellId = cellIdFromXY(x, y);
  const cell = state.board.get(cellId);
  if (!cell) return null;

  const effects: TEffect[] = [];
  cell.layers.push(createPieceLayer(state, piece));
  effects.push({ type: "PIECE_PLACED", cell: cellId, pieceId: piece.id });

  const neighbors = neighborsOf(state, x, y);
  if (neighbors.length > 0) {
    piece.type = "SUPPLY";

    const targetPiece = neighbors.reduce((a, b) =>
      a.piece.currentValue > b.piece.currentValue ? a : b,
    );
    targetPiece.piece.currentValue -= piece.currentValue;
    effects.push({
      type: "PIECE_DRAINED",
      cell: targetPiece.cell,
      pieceId: targetPiece.piece.id,
      amount: piece.currentValue,
    });
  }

  // Layers resolve after the drain, so a cover torn open by this same move
  // reveals a flower that only the *next* placement can reach — the reveal is
  // the reward, not a retroactive change to the move that earned it.
  resolveLayers(state, x, y, piece, effects);

  state.moves += 1;
  advanceGoals(state, piece);
  // Last, so the report never carries "and then three new pieces appeared"
  // in among the effects a blocker wants to animate.
  refillTray(state);
  return { moves: state.moves, effects };
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

/**
 * The flower at (x, y), or null when there is none *or* it is still covered.
 * Covered means out of play: a vine-wrapped vegetable is neither a drain
 * target nor enough to turn a new arrival into supply, which is what makes
 * uncovering it worth doing.
 */
export const exposedPieceAt = (
  state: TGameState,
  x: number,
  y: number,
): TPiece | null => {
  const cell = state.board.get(cellIdFromXY(x, y));
  if (!cell || blocksAdjacency(cell)) return null;
  return pieceIn(cell);
};

const createPiece = (
  state: TGameState,
  assetKey = nextFrom(state, state.pieces),
): TPiece => {
  const value = nextInt(state, PIECE_VALUE_MIN, PIECE_VALUE_MAX);
  return {
    id: state.nextPieceId++,
    assetKey,
    type: "BLOOM",
    startingValue: value,
    currentValue: value,
  };
};

// Order is load-bearing, not cosmetic: placeFromTray picks the drain target
// with a `>` reduce, which keeps the later of two equal values, so a tie
// resolves to whichever cell is last here — today, the one above. Reordering
// this list changes which flower drains, and resolve.ts mirrors it so a move
// that damages two covers logs them in the same order.
const neighborsOf = (
  state: TGameState,
  x: number,
  y: number,
): { cell: CellId; piece: TPiece }[] => {
  const candidates: [CellId, TPiece | null][] = [
    [cellIdFromXY(x + 1, y), exposedPieceAt(state, x + 1, y)],
    [cellIdFromXY(x, y + 1), exposedPieceAt(state, x, y + 1)],
    [cellIdFromXY(x - 1, y), exposedPieceAt(state, x - 1, y)],
    [cellIdFromXY(x, y - 1), exposedPieceAt(state, x, y - 1)],
  ];
  return candidates
    .filter((entry): entry is [CellId, TPiece] => entry[1] != null)
    .map(([cell, piece]) => ({ cell, piece }));
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
