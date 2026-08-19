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
export const PIECE_VALUE_MIN = 1;
export const PIECE_VALUE_MAX = 12;

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

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const spec = level.data[y * columns + x];
      if (spec.type === "EMPTY") continue;

      const cell: TCell = { layers: [] };
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

export const canPlace = (state: TGameState, x: number, y: number): boolean => {
  const cell = state.board.get(cellIdFromXY(x, y));
  return cell !== undefined && !blocksPlacement(cell) && state.tray.length > 0;
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

  resolveLayers(state, x, y, piece, effects);

  state.moves += 1;
  advanceGoals(state, piece);
  refillTray(state);
  return { moves: state.moves, effects };
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

const advanceGoals = (state: TGameState, piece: TPiece) => {
  for (const goal of state.goals) {
    if (goal.type !== piece.assetKey) continue;
    goal.progress = Math.min(goal.target, goal.progress + 1);
  }
};
