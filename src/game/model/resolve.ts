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

export type TEffect =
  | { type: "PIECE_PLACED"; cell: CellId; pieceId: number }
  | { type: "PIECE_DRAINED"; cell: CellId; pieceId: number; amount: number }
  | {
      type: "LAYER_DAMAGED";
      cell: CellId;
      layerId: number;
      kind: TLayerKind;
      amount: number;
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
  | { type: "PIECE_REVEALED"; cell: CellId; pieceId: number };

export type TMoveReport = {
  moves: number;
  effects: TEffect[];
};

export const resolveLayers = (
  state: TGameState,
  x: number,
  y: number,
  placed: TPiece | null,
  effects: TEffect[],
) => {
  const origin = cellIdFromXY(x, y);

  dispatch(state, { kind: "PLACED_HERE", origin }, origin, placed, effects);

  for (const cell of neighborIdsOf(x, y)) {
    dispatch(state, { kind: "PLACED_ADJACENT", origin }, cell, placed, effects);
  }

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

const neighborIdsOf = (x: number, y: number): CellId[] => [
  cellIdFromXY(x + 1, y),
  cellIdFromXY(x, y + 1),
  cellIdFromXY(x - 1, y),
  cellIdFromXY(x, y - 1),
];

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

const apply = (
  state: TGameState,
  cellId: CellId,
  outcome: TLayerOutcome,
  effects: TEffect[],
) => {
  const cell = state.board.get(cellId);
  if (!cell) return;

  const layer = topLayerOf(cell);
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
