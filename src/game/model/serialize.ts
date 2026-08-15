import { cellIdFromXY, type CellId } from "../id";
import {
  SAVE_VERSION,
  type TLayerSnapshot,
  type TPieceSnapshot,
  type TSaveState,
} from "../state/schema";
import type { TLevel } from "./rules";
import type { TCell, TGameState, TLayer } from "./types";

/** Plain data in, plain data out — no storage access, so this stays testable. */
export const toSnapshot = (state: TGameState): TSaveState => {
  const board: TLayerSnapshot[][] = [];
  // Written by explicit row-major loop rather than map iteration, so the order
  // never depends on how the board happened to be built. A hole and a bare cell
  // both write an empty stack: the snapshot carries no board shape of its own,
  // because fromSnapshot reads that back off the level.
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
  const boardPieces = snapshot.board.flatMap(piecesIn);
  const pieces = [...snapshot.tray, ...boardPieces];
  if (!pieces.every((piece) => pool.has(piece.assetKey))) return null;

  const board = new Map<CellId, TCell>();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const index = y * columns + x;
      const stack = snapshot.board[index];
      if (level.data[index].type === "EMPTY") {
        // Anything parked where the level now has a hole means the save
        // predates the edit, so it goes the same way as any other stale save.
        if (stack.length > 0) return null;
        continue;
      }
      board.set(cellIdFromXY(x, y), { layers: stack.map(copyLayer) });
    }
  }

  // Deliberately no check that the restored covers match what the level
  // authors. Unlike a hole, a layer is mutable game state: the moment the
  // player clears one it legitimately diverges from the level file, and
  // rejecting that would throw away the save on the first successful move.

  return {
    level: levelIndex,
    moves: snapshot.moves,
    score: snapshot.score,
    rows,
    columns,
    pieces: level.pieces,
    rng: snapshot.rng,
    // Carries the counter past every id already in play, so a save claiming a
    // lower one can't have the next drawn flower collide with a restored one in
    // the views' keyed lookups. Ids duplicated inside the save itself stay
    // duplicated — this settles the future, not the past.
    nextPieceId: pieces.reduce(
      (max, piece) => Math.max(max, piece.id + 1),
      snapshot.nextPieceId,
    ),
    // The same guarantee for layers, which have their own counter and their
    // own keyed lookup in the board's blocker views.
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

/** Copied one level deeper than a spread, because a PIECE layer holds a piece
 *  the restored game must not share with the snapshot it came from. */
const copyLayer = (layer: TLayer): TLayer =>
  layer.kind === "PIECE"
    ? { ...layer, piece: { ...layer.piece } }
    : { ...layer };
