import type { CellId } from "../id";
import type {
  TBlockerSpec,
  TCell,
  TGameState,
  TLayer,
  TLayerKind,
  TPiece,
} from "./types";

export type TTriggerKind = "PLACED_HERE" | "PLACED_ADJACENT" | "MOVE_ENDED";

export type TTrigger = {
  kind: TTriggerKind;
  origin: CellId;
};

export type TLayerContext = {
  trigger: TTrigger;
  layer: Readonly<TLayer>;
  cell: Readonly<TCell>;
  placed: Readonly<TPiece> | null;
  board: ReadonlyMap<CellId, Readonly<TCell>>;
};

export type TLayerOutcome =
  | { type: "NONE" }
  | { type: "DAMAGE"; amount: number }
  | { type: "CLEAR" }
  | { type: "REPLACE"; blocker: TBlockerSpec };

export type TLayerBehavior = {
  readonly blocksPlacement: boolean;
  readonly blocksAdjacency: boolean;
  readonly triggers: readonly TTriggerKind[];
  react(context: TLayerContext): TLayerOutcome;
};

const NONE: TLayerOutcome = { type: "NONE" };

const pieceBehavior: TLayerBehavior = {
  blocksPlacement: true,
  blocksAdjacency: false,
  triggers: [],
  react: () => NONE,
};

const vineBehavior: TLayerBehavior = {
  blocksPlacement: true,
  blocksAdjacency: true,
  triggers: ["PLACED_ADJACENT"],
  react: () => ({ type: "DAMAGE", amount: 1 }),
};

const stoneBehavior: TLayerBehavior = {
  blocksPlacement: true,
  blocksAdjacency: true,
  triggers: ["MOVE_ENDED"],
  react: () => ({ type: "DAMAGE", amount: 1 }),
};

export const LAYER_BEHAVIORS: Record<TLayerKind, TLayerBehavior> = {
  PIECE: pieceBehavior,
  VINE: vineBehavior,
  STONE: stoneBehavior,
};

export const topLayerOf = (cell: TCell): TLayer | null =>
  cell.layers.length === 0 ? null : cell.layers[cell.layers.length - 1];

export const pieceIn = (cell: TCell): TPiece | null => {
  for (const layer of cell.layers) {
    if (layer.kind === "PIECE") return layer.piece;
  }
  return null;
};

export const blocksPlacement = (cell: TCell): boolean =>
  cell.layers.some((layer) => LAYER_BEHAVIORS[layer.kind].blocksPlacement);

export const blocksAdjacency = (cell: TCell): boolean =>
  cell.layers.some((layer) => LAYER_BEHAVIORS[layer.kind].blocksAdjacency);

export const createLayer = (
  state: TGameState,
  blocker: TBlockerSpec,
): TLayer => ({
  id: state.nextLayerId++,
  kind: blocker.kind,
  hits: blocker.hits,
  maxHits: blocker.hits,
});

export const createPieceLayer = (state: TGameState, piece: TPiece): TLayer => ({
  id: state.nextLayerId++,
  kind: "PIECE",
  piece,
});
