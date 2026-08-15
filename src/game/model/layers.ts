import type { CellId } from "../id";
import type {
  TBlockerSpec,
  TCell,
  TGameState,
  TLayer,
  TLayerKind,
  TPiece,
} from "./types";

/**
 * Why a layer is being asked to react. Named for what *happened*, never for
 * what should happen — deciding that is the behavior's entire job.
 *
 * These are the "centralized data points": the pipeline in resolve.ts derives
 * every trigger from the move it is resolving. Layers never observe each other
 * and never observe the store, so nothing can fire out of order.
 */
export type TTriggerKind =
  /** A piece was placed into this very cell. Only reachable by a layer whose
   *  behavior sets blocksPlacement: false — mud you can stamp through. */
  | "PLACED_HERE"
  /** A piece was placed into an orthogonally adjacent cell. */
  | "PLACED_ADJACENT"
  /** Every layer still standing, once the placement phases have settled. This
   *  is where a per-move countdown lives without inventing a second pipeline. */
  | "MOVE_ENDED";

export type TTrigger = {
  kind: TTriggerKind;
  /** Where the trigger came from — the cell that was played. Equal to the
   *  layer's own cell for PLACED_HERE, and for MOVE_ENDED. */
  origin: CellId;
};

/**
 * Everything a behavior may look at, and nothing it may write. The behavior
 * decides, the pipeline mutates. That split is what keeps resolution a
 * function of its inputs, and what lets a behavior be tested against a plain
 * object literal with no board and no state to build.
 */
export type TLayerContext = {
  trigger: TTrigger;
  layer: Readonly<TLayer>;
  /** The cell the layer sits in, including whatever is under it. */
  cell: Readonly<TCell>;
  /** The piece the player just placed; null for triggers not tied to one
   *  placement. The field is where a "cleared by a bomb" trigger would land
   *  without reshaping this type. */
  placed: Readonly<TPiece> | null;
  /** The whole board, read-only, for a behavior that must look past its own
   *  cell. No mutation path is exposed, deliberately. */
  board: ReadonlyMap<CellId, Readonly<TCell>>;
};

/**
 * What a behavior asks the pipeline to do. Data, not an action: the behavior
 * never touches state, so a test compares the returned object and the pipeline
 * stays the single writer.
 */
export type TLayerOutcome =
  | { type: "NONE" }
  /** The pipeline clears the layer when this takes hits to zero, so a behavior
   *  never has to special-case its own death. */
  | { type: "DAMAGE"; amount: number }
  | { type: "CLEAR" }
  /** Swap in a different blocker in the same slot — a thick vine thinning into
   *  a wisp. Gets a fresh id, so the view rebuilds rather than trying to morph
   *  one sprite into another. */
  | { type: "REPLACE"; blocker: TBlockerSpec };

/** One blocker's rules. Pure and module-level: nothing is constructed when a
 *  save is restored, and nothing has to be torn down when a layer clears. */
export type TLayerBehavior = {
  /** Can a tray piece be dropped into a cell topped by this layer? */
  readonly blocksPlacement: boolean;
  /** Does this layer hide what is under it from neighborsOf — keeping a
   *  covered flower out of the supply/drain rules until it is uncovered? */
  readonly blocksAdjacency: boolean;
  /** Triggers this kind wants. Anything else is never dispatched to it. This
   *  list is the "subscription", resolved by lookup rather than registration,
   *  which is what keeps the ordering in resolve.ts and not in whatever order
   *  listeners happened to attach. */
  readonly triggers: readonly TTriggerKind[];
  /** Called once per trigger that reaches this layer. Must not mutate anything
   *  it is handed. */
  react(context: TLayerContext): TLayerOutcome;
};

const NONE: TLayerOutcome = { type: "NONE" };

/**
 * The flower's own entry. Inert by design: it blocks a second placement into
 * its cell — which is exactly what `canPlace` used to say by testing for null
 * — and reacts to nothing, so the pipeline can walk a stack without ever
 * asking whether the entry it is holding is the piece.
 */
const pieceBehavior: TLayerBehavior = {
  blocksPlacement: true,
  blocksAdjacency: false,
  triggers: [],
  react: () => NONE,
};

/**
 * The reference blocker: a vine mat that thins by one every time the player
 * plays beside it, and tears open when it runs out. It hides what it covers,
 * so a vine-wrapped vegetable is neither drained nor able to turn a new
 * arrival into supply until the vine is gone — which is what makes covering it
 * a setback rather than decoration.
 */
const vineBehavior: TLayerBehavior = {
  blocksPlacement: true,
  blocksAdjacency: true,
  triggers: ["PLACED_ADJACENT"],
  react: () => ({ type: "DAMAGE", amount: 1 }),
};

/**
 * The second kind, and the one that proves the registry generalizes: it reacts
 * to a different *trigger* rather than a different amount. A stone slab erodes
 * by one every move wherever the player played, so it comes off on a timer
 * instead of on adjacency. A second adjacency blocker would have proved
 * nothing.
 */
const stoneBehavior: TLayerBehavior = {
  blocksPlacement: true,
  blocksAdjacency: true,
  triggers: ["MOVE_ENDED"],
  react: () => ({ type: "DAMAGE", amount: 1 }),
};

/**
 * Keyed by kind rather than subscribed per instance. `Record` — not `Partial`,
 * not `Map` — on purpose: adding a TLayerKind is a compile error until its
 * behavior exists here.
 */
export const LAYER_BEHAVIORS: Record<TLayerKind, TLayerBehavior> = {
  PIECE: pieceBehavior,
  VINE: vineBehavior,
  STONE: stoneBehavior,
};

/** The only layer a trigger ever reaches — see resolve.ts for why. */
export const topLayerOf = (cell: TCell): TLayer | null =>
  cell.layers.length === 0 ? null : cell.layers[cell.layers.length - 1];

/** The flower in this cell, covered or not. */
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

/** Ids come off state.nextLayerId, so a blocker cleared and re-authored by a
 *  REPLACE never collides with the view that is still tearing down. */
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
