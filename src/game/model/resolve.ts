import { cellIdFromXY, type CellId } from "../id";
import {
  createLayer,
  LAYER_BEHAVIORS,
  pieceIn,
  topLayerOf,
  type TLayerOutcome,
  type TTrigger,
  type TTriggerKind,
} from "./layers";
import type { TGameState, TLayerKind, TPiece } from "./types";

/**
 * One thing that happened, in the order it happened. Nothing here is needed to
 * rebuild the state — which is exactly why a report is returned alongside the
 * state rather than stored in it, and why it is never serialized.
 *
 * Every effect carries ids and coordinates, never object references: a cleared
 * layer is already gone from the state by the time a view reads the report, and
 * value-only effects compare cleanly with `toEqual` in a test.
 */
export type TEffect =
  | { type: "PIECE_PLACED"; cell: CellId; pieceId: number }
  | { type: "PIECE_DRAINED"; cell: CellId; pieceId: number; amount: number }
  | {
      type: "LAYER_DAMAGED";
      cell: CellId;
      layerId: number;
      kind: TLayerKind;
      amount: number;
      /** Hits *after* the damage, so a view can pick a stage of art without
       *  re-deriving it from the state it is about to redraw anyway. */
      hits: number;
    }
  | { type: "LAYER_CLEARED"; cell: CellId; layerId: number; kind: TLayerKind }
  | {
      type: "LAYER_REPLACED";
      cell: CellId;
      removedLayerId: number;
      layerId: number;
      kind: TLayerKind;
    }
  /** The last cover came off a flower, which is the moment it re-enters the
   *  supply/drain rules. Emitted after the LAYER_CLEARED that caused it. */
  | { type: "PIECE_REVEALED"; cell: CellId; pieceId: number };

export type TMoveReport = {
  /** state.moves as it stands after the move, so a view that fell behind can
   *  tell it is holding a stale report. */
  moves: number;
  /** Strictly ordered; index 0 happened first. This list *is* the sequence —
   *  it is what a subscription list could never have given us. */
  effects: TEffect[];
};

/**
 * Runs every layer that cares about this move, in a fixed order written out
 * below so it reads top to bottom.
 *
 * Phase order is the whole point of this function. It lives here, in one
 * readable place, rather than in whatever order listeners happened to
 * register — which is what makes resolution deterministic, replayable and
 * testable, the same property neighborsOf's candidate order already has.
 *
 * Only the topmost layer of a cell is dispatched to. Two reasons: it is the
 * one whose art the player can see, so a buried layer changing would be a
 * change with no feedback; and it caps a cell at losing one layer per trigger,
 * which is what keeps this bounded without a visited set.
 *
 * There is deliberately no cascade in this cut — a clear does not re-trigger
 * its neighbours. When one is wanted, it goes around phases 1 and 2 as a
 * bounded `for (let pass = 0; pass < MAX_PASSES; pass++)` loop seeded by the
 * clears of the previous pass; nothing here would have to be undone.
 */
export const resolveLayers = (
  state: TGameState,
  x: number,
  y: number,
  placed: TPiece | null,
  effects: TEffect[],
) => {
  const origin = cellIdFromXY(x, y);

  // 1. The cell just played.
  dispatch(state, { kind: "PLACED_HERE", origin }, origin, placed, effects);

  // 2. Its four orthogonal neighbours, in neighborsOf's candidate order, so a
  //    move that damages two covers logs them in the same order the drain rule
  //    would have picked between them.
  for (const cell of neighborIdsOf(x, y)) {
    dispatch(state, { kind: "PLACED_ADJACENT", origin }, cell, placed, effects);
  }

  // 3. Every remaining cover, row-major, once the placement has settled.
  for (let row = 0; row < state.rows; row++) {
    for (let column = 0; column < state.columns; column++) {
      dispatch(
        state,
        { kind: "MOVE_ENDED", origin },
        cellIdFromXY(column, row),
        placed,
        effects,
      );
    }
  }
};

/** The four orthogonal neighbours in the order neighborsOf lists them. Kept in
 *  step with rules.ts deliberately: see the comment there on why that order is
 *  load-bearing. */
const neighborIdsOf = (x: number, y: number): CellId[] => [
  cellIdFromXY(x + 1, y),
  cellIdFromXY(x, y + 1),
  cellIdFromXY(x - 1, y),
  cellIdFromXY(x, y - 1),
];

/** Asks one cell's topmost layer to react, then applies whatever it asked for.
 *  A cell that is a hole, is bare, or is topped by a layer that did not
 *  subscribe to this trigger costs one lookup and nothing else. */
const dispatch = (
  state: TGameState,
  trigger: TTrigger,
  cellId: CellId,
  placed: TPiece | null,
  effects: TEffect[],
) => {
  const cell = state.board.get(cellId);
  if (!cell) return;

  const layer = topLayerOf(cell);
  if (!layer) return;

  const behavior = LAYER_BEHAVIORS[layer.kind];
  if (!subscribes(behavior.triggers, trigger.kind)) return;

  const outcome = behavior.react({
    trigger,
    layer,
    cell,
    placed,
    board: state.board,
  });
  apply(state, cellId, outcome, effects);
};

const subscribes = (
  triggers: readonly TTriggerKind[],
  kind: TTriggerKind,
): boolean => triggers.includes(kind);

/**
 * The single writer. Every mutation a layer can cause passes through here, so
 * "what a blocker is allowed to do to the board" is one readable switch rather
 * than something spread across the behaviors.
 */
const apply = (
  state: TGameState,
  cellId: CellId,
  outcome: TLayerOutcome,
  effects: TEffect[],
) => {
  const cell = state.board.get(cellId);
  if (!cell) return;

  const layer = topLayerOf(cell);
  // A PIECE layer has no hits to spend and nothing that should pop it off the
  // stack; guarding here rather than in every branch keeps the flower inert
  // even if a future behavior returns something it should not.
  if (!layer || layer.kind === "PIECE") return;

  switch (outcome.type) {
    case "NONE":
      return;

    case "DAMAGE": {
      layer.hits -= outcome.amount;
      effects.push({
        type: "LAYER_DAMAGED",
        cell: cellId,
        layerId: layer.id,
        kind: layer.kind,
        amount: outcome.amount,
        hits: layer.hits,
      });
      // Both effects are logged, in this order, so a view can play a hit and
      // then a burst rather than having to infer the death from the hit count.
      if (layer.hits <= 0) clear(state, cellId, effects);
      return;
    }

    case "CLEAR":
      clear(state, cellId, effects);
      return;

    case "REPLACE": {
      cell.layers.pop();
      const replacement = createLayer(state, outcome.blocker);
      cell.layers.push(replacement);
      effects.push({
        type: "LAYER_REPLACED",
        cell: cellId,
        removedLayerId: layer.id,
        layerId: replacement.id,
        kind: replacement.kind,
      });
      return;
    }
  }
};

/** Pops the topmost layer and, if that was the last thing covering a flower,
 *  says so — the moment the flower re-enters the supply/drain rules. */
const clear = (state: TGameState, cellId: CellId, effects: TEffect[]) => {
  const cell = state.board.get(cellId);
  if (!cell) return;

  const layer = cell.layers.pop();
  if (!layer || layer.kind === "PIECE") return;

  effects.push({
    type: "LAYER_CLEARED",
    cell: cellId,
    layerId: layer.id,
    kind: layer.kind,
  });

  const piece = pieceIn(cell);
  if (!piece) return;
  if (cell.layers.some((above) => above.kind !== "PIECE")) return;
  effects.push({ type: "PIECE_REVEALED", cell: cellId, pieceId: piece.id });
};
