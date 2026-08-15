import { cellIdFromXY, type CellId } from "../id";
import {
  SAVE_VERSION,
  type TPieceSnapshot,
  type TSaveState,
} from "../state/schema";
import type { TLevel } from "./rules";
import type { TGameState, TPiece } from "./types";

/** Plain data in, plain data out — no storage access, so this stays testable. */
export const toSnapshot = (state: TGameState): TSaveState => {
  const board: (TPieceSnapshot | null)[] = [];
  // Written by explicit row-major loop rather than map iteration, so the order
  // never depends on how the board happened to be built.
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.columns; x++) {
      board.push(state.board.get(cellIdFromXY(x, y)) ?? null);
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
    board: board.map(copyPiece),
    tray: state.tray.map((piece) => ({ ...piece })),
  };
};

/**
 * Rebuilds a game from a snapshot, or returns null when the snapshot does not
 * fit the level it claims to belong to — a save written before the level was
 * edited, or the empty placeholder save. The caller then starts a fresh game.
 *
 * The asset-key check matters beyond tidiness: the controller only preloads
 * `level.pieces` and the goal art, so a piece carrying a key from an older
 * piece list would resolve to a missing texture.
 */
export const fromSnapshot = (
  snapshot: TSaveState,
  levelIndex: number,
  level: TLevel,
): TGameState | null => {
  if (snapshot.level !== levelIndex) return null;

  const columns = level.columns;
  const rows = level.data.length / columns;
  // Both checks are needed: the cell count alone survives a reshape.
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
  const pieces = [...snapshot.tray, ...snapshot.board.filter(isPiece)];
  if (!pieces.every((piece) => pool.has(piece.assetKey))) return null;

  const board = new Map<CellId, TPiece | null>();
  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      board.set(cellIdFromXY(x, y), copyPiece(snapshot.board[index++]));
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
    // Guard against a doctored save handing two live pieces the same id, which
    // would collide in the views' keyed lookups.
    nextPieceId: pieces.reduce(
      (max, piece) => Math.max(max, piece.id + 1),
      snapshot.nextPieceId,
    ),
    goals: snapshot.goals.map((goal) => ({ ...goal })),
    board,
    tray: snapshot.tray.map((piece) => ({ ...piece })),
  };
};

const isPiece = (piece: TPieceSnapshot | null): piece is TPieceSnapshot =>
  piece !== null;

const copyPiece = (piece: TPiece | null): TPiece | null =>
  piece === null ? null : { ...piece };
