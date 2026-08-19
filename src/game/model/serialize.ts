import { cellIdFromXY, type CellId } from "../id";
import {
  SAVE_VERSION,
  type TLayerSnapshot,
  type TPieceSnapshot,
  type TSaveState,
} from "../state/schema";
import type { TLevel } from "./rules";
import type { TCell, TGameState, TLayer } from "./types";

export const toSnapshot = (state: TGameState): TSaveState => {
  const board: TLayerSnapshot[][] = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.columns; x++) {
      const cell = state.board.get(cellIdFromXY(x, y));
      board.push(cell ? cell.layers.map(copyLayer) : []);
    }
  }

  return {
    version: SAVE_VERSION,
    level: state.level,
    moves: state.moves,
    score: state.score,
    rng: state.rng,
    nextPieceId: state.nextPieceId,
    nextLayerId: state.nextLayerId,
    goals: state.goals.map((goal) => ({ ...goal })),
    columns: state.columns,
    board,
    tray: state.tray.map((piece) => ({ ...piece })),
  };
};

export const fromSnapshot = (
  snapshot: TSaveState,
  levelIndex: number,
  level: TLevel,
): TGameState | null => {
  if (snapshot.level !== levelIndex) return null;

  const columns = level.columns;
  const rows = level.data.length / columns;
  if (snapshot.columns !== columns) return null;
  if (snapshot.board.length !== rows * columns) return null;

  if (snapshot.goals.length !== level.goals.length) return null;
  const goalsMatch = snapshot.goals.every(
    (goal, index) =>
      goal.type === level.goals[index].type &&
      goal.target === level.goals[index].count &&
      goal.progress <= goal.target,
  );
  if (!goalsMatch) return null;

  const pool = new Set<string>(level.pieces);
  const boardPieces = snapshot.board.flatMap(piecesIn);
  const pieces = [...snapshot.tray, ...boardPieces];
  if (!pieces.every((piece) => pool.has(piece.assetKey))) return null;

  const board = new Map<CellId, TCell>();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const index = y * columns + x;
      const stack = snapshot.board[index];
      if (level.data[index].type === "EMPTY") {
        if (stack.length > 0) return null;
        continue;
      }
      board.set(cellIdFromXY(x, y), { layers: stack.map(copyLayer) });
    }
  }

  return {
    level: levelIndex,
    moves: snapshot.moves,
    score: snapshot.score,
    rows,
    columns,
    pieces: level.pieces,
    rng: snapshot.rng,
    nextPieceId: pieces.reduce(
      (max, piece) => Math.max(max, piece.id + 1),
      snapshot.nextPieceId,
    ),
    nextLayerId: snapshot.board
      .flat()
      .reduce(
        (max, layer) => Math.max(max, layer.id + 1),
        snapshot.nextLayerId,
      ),
    goals: snapshot.goals.map((goal) => ({ ...goal })),
    board,
    tray: snapshot.tray.map((piece) => ({ ...piece })),
  };
};

const piecesIn = (stack: TLayerSnapshot[]): TPieceSnapshot[] =>
  stack.filter((layer) => layer.kind === "PIECE").map((layer) => layer.piece);

const copyLayer = (layer: TLayer): TLayer =>
  layer.kind === "PIECE"
    ? { ...layer, piece: { ...layer.piece } }
    : { ...layer };
