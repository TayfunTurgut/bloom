import type { TConfig } from "../config/schema";
import { cellIdFromXY, xyFromCellId, type CellId } from "../id";
import { nextFrom, nextInt, randomSeed } from "./rng";
import type {
  TCell,
  TEffect,
  TGameState,
  TGoal,
  TMoveReport,
  TPiece,
} from "./types";

export type TLevel = TConfig["levels"][number];

export const TRAY_SIZE = 3;
export const PIECE_VALUE_MIN = 1;
export const PIECE_VALUE_MAX = 12;
export const SCORE_PER_GOAL_FLOWER = 5;
export const MILESTONE_COUNT = 3;

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
    goals: level.goals.map((goal) => ({
      type: goal.type,
      target: goal.count,
      progress: 0,
    })),
    board: new Map(),
    tray: [],
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const spec = level.data[y * columns + x];
      if (spec.type === "EMPTY") continue;

      const cell: TCell = { piece: null };
      if (spec.piece) {
        const piece = createPiece(state, spec.piece, spec.value);
        piece.type = "BLOOM";
        cell.piece = piece;
      }
      state.board.set(cellIdFromXY(x, y), cell);
    }
  }

  refillTray(state);
  return state;
};

export const canPlace = (state: TGameState, x: number, y: number): boolean => {
  const cell = state.board.get(cellIdFromXY(x, y));
  return cell !== undefined && cell.piece === null && state.tray.length > 0;
};

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

  const wasWon = isLevelWon(state);
  const effects: TEffect[] = [];
  cell.piece = piece;
  effects.push({ type: "PIECE_PLACED", cell: cellId, pieceId: piece.id });

  const neighbors = vinedNeighborsOf(state, x, y);
  if (neighbors.length === 0) {
    piece.type = "BLOOM";
    effects.push({
      type: "BLOOMED",
      cell: cellId,
      pieceId: piece.id,
      value: piece.currentValue,
    });
  } else {
    piece.type = "SUPPLY";
    const target = neighbors.reduce((best, candidate) =>
      candidate.piece.currentValue > best.piece.currentValue ? candidate : best,
    );
    const remaining = Math.max(
      0,
      target.piece.currentValue - piece.currentValue,
    );
    target.piece.currentValue = remaining;
    effects.push({
      type: "DRAINED",
      from: cellId,
      to: target.cell,
      supplyId: piece.id,
      targetId: target.piece.id,
      assetKey: piece.assetKey,
      amount: piece.currentValue,
      remaining,
    });
    if (remaining === 0) popBloom(state, target.cell, effects);
  }

  state.moves += 1;
  refillTray(state);

  if (!wasWon && isLevelWon(state)) {
    effects.push({ type: "LEVEL_WON", milestones: milestonesReached(state) });
  } else if (isLevelFailed(state)) {
    effects.push({ type: "LEVEL_FAILED" });
  }

  return { moves: state.moves, effects };
};

export const swapTray = (state: TGameState): TMoveReport | null => {
  if (state.tray.length < 2) return null;
  const last = state.tray.length - 1;
  const a = state.tray[last];
  const b = state.tray[last - 1];
  state.tray[last] = b;
  state.tray[last - 1] = a;
  return {
    moves: state.moves,
    effects: [{ type: "TRAY_SWAPPED", a: a.id, b: b.id }],
  };
};

export const refillTray = (state: TGameState) => {
  while (state.tray.length < TRAY_SIZE) {
    state.tray.unshift(createPiece(state));
  }
};

export const goalRemaining = (goal: TGoal): number =>
  Math.max(0, goal.target - goal.progress);

export const isGoalComplete = (goal: TGoal): boolean =>
  goal.progress >= goal.target;

export const isLevelWon = (state: TGameState): boolean =>
  state.goals.every(isGoalComplete);

export const isLevelFailed = (state: TGameState): boolean =>
  !isLevelWon(state) &&
  [...state.board.values()].every((cell) => cell.piece !== null);

export const scoreMax = (state: TGameState): number =>
  state.goals.reduce(
    (sum, goal) => sum + goal.target * SCORE_PER_GOAL_FLOWER,
    0,
  );

export const milestoneThresholds = (state: TGameState): number[] => {
  const max = scoreMax(state);
  return Array.from({ length: MILESTONE_COUNT }, (_, index) =>
    Math.ceil((max * (index + 1)) / MILESTONE_COUNT),
  );
};

export const milestonesReached = (state: TGameState): number =>
  milestoneThresholds(state).filter((threshold) => state.score >= threshold)
    .length;

export const bloomAt = (
  state: TGameState,
  x: number,
  y: number,
): TPiece | null => {
  const piece = state.board.get(cellIdFromXY(x, y))?.piece;
  return piece && piece.type === "BLOOM" && piece.currentValue > 0
    ? piece
    : null;
};

const NEIGHBOR_OFFSETS: readonly [number, number][] = [
  [-1, 0],
  [0, -1],
  [1, 0],
  [0, 1],
];

const popBloom = (state: TGameState, cellId: CellId, effects: TEffect[]) => {
  const cell = state.board.get(cellId);
  const bloom = cell?.piece;
  if (!cell || !bloom) return;

  cell.piece = null;
  effects.push({
    type: "POPPED",
    cell: cellId,
    pieceId: bloom.id,
    assetKey: bloom.assetKey,
    flower: "BLOOM",
  });

  advanceGoals(state, bloom);

  const previous = state.score;
  state.score = Math.min(scoreMax(state), previous + bloom.startingValue);
  effects.push({
    type: "SCORED",
    amount: state.score - previous,
    total: state.score,
  });
  milestoneThresholds(state).forEach((threshold, index) => {
    if (previous < threshold && threshold <= state.score) {
      effects.push({ type: "MILESTONE_REACHED", index });
    }
  });

  const { x, y } = xyFromCellId(cellId);
  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const neighborId = cellIdFromXY(x + dx, y + dy);
    const neighbor = state.board.get(neighborId);
    const supply = neighbor?.piece;
    if (!neighbor || !supply || supply.type !== "SUPPLY") continue;
    neighbor.piece = null;
    effects.push({
      type: "POPPED",
      cell: neighborId,
      pieceId: supply.id,
      assetKey: supply.assetKey,
      flower: "SUPPLY",
    });
  }
};

const createPiece = (
  state: TGameState,
  assetKey = nextFrom(state, state.pieces),
  value = nextInt(state, PIECE_VALUE_MIN, PIECE_VALUE_MAX),
): TPiece => ({
  id: state.nextPieceId++,
  assetKey,
  type: "SEED",
  startingValue: value,
  currentValue: value,
});

const vinedNeighborsOf = (
  state: TGameState,
  x: number,
  y: number,
): { cell: CellId; piece: TPiece }[] => {
  const found: { cell: CellId; piece: TPiece }[] = [];
  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const piece = bloomAt(state, x + dx, y + dy);
    if (piece) found.push({ cell: cellIdFromXY(x + dx, y + dy), piece });
  }
  return found;
};

const advanceGoals = (state: TGameState, piece: TPiece) => {
  for (const goal of state.goals) {
    if (goal.type !== piece.assetKey) continue;
    goal.progress = Math.min(goal.target, goal.progress + 1);
  }
};
