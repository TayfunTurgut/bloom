import { cellIdFromXY, type CellId } from "../id";
import {
  SAVE_VERSION,
  type TPieceSnapshot,
  type TSaveState,
} from "../state/schema";
import type { TLevel } from "./rules";
import type { TCell, TGameState } from "./types";

export const toSnapshot = (state: TGameState): TSaveState => {
  const board: (TPieceSnapshot | null)[] = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.columns; x++) {
      const cell = state.board.get(cellIdFromXY(x, y));
      board.push(cell?.piece ? { ...cell.piece } : null);
    }
  }

  return {
    version: SAVE_VERSION,
    level: state.level,
    moves: state.moves,
    score: state.score,
    rng: state.rng,
    nextPieceId: state.nextPieceId,
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
  const boardPieces = snapshot.board.filter(
    (piece): piece is TPieceSnapshot => piece !== null,
  );
  const pieces = [...snapshot.tray, ...boardPieces];
  if (!pieces.every((piece) => pool.has(piece.assetKey))) return null;

  const board = new Map<CellId, TCell>();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const index = y * columns + x;
      const piece = snapshot.board[index];
      if (level.data[index].type === "EMPTY") {
        if (piece !== null) return null;
        continue;
      }
      board.set(cellIdFromXY(x, y), { piece: piece ? { ...piece } : null });
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
    goals: snapshot.goals.map((goal) => ({ ...goal })),
    board,
    tray: snapshot.tray.map((piece) => ({ ...piece })),
  };
};
