import type { AssetKey } from "../../assetpack/assets";
import type { CellId } from "../id";

/**
 * A string union rather than a numeric enum so it survives a round trip
 * through the save file as something readable.
 */
export type TFlowerType = "BLOOM" | "SUPPLY";

/** A flower as data. The view that draws it lives in components/piece.ts. */
export type TPiece = {
  /** Stable for the piece's whole life, from tray slot to board cell. Views
   *  key their sprites off it, so it must not be reused within a game. */
  id: number;
  assetKey: AssetKey;
  type: TFlowerType;
  startingValue: number;
  currentValue: number;
};

/**
 * Single-sourced so the zod enum in state/schema.ts cannot drift from the
 * union, and so LAYER_BEHAVIORS and LAYER_VIEWS are exhaustive by construction:
 * adding a kind here is a compile error until both have an entry for it.
 */
export const BLOCKER_KINDS = ["VINE", "STONE"] as const;
export type TBlockerKind = (typeof BLOCKER_KINDS)[number];

/** Every entry in a stack carries an id so views can key sprites off it, on
 *  the same terms as TPiece.id — drawn from state.nextLayerId and never reused
 *  within a game. */
type TLayerBase = { id: number };

/**
 * The flower is a layer like any other, so iterating a stack needs no special
 * case for it. Its entry in LAYER_BEHAVIORS is inert: it reacts to nothing.
 */
export type TPieceLayer = TLayerBase & { kind: "PIECE"; piece: TPiece };

/** A cover sitting over a cell, as data. Its rules live in model/layers.ts and
 *  its art in components/layer.ts — nothing kind-specific belongs here. */
export type TBlockerLayer = TLayerBase & {
  kind: TBlockerKind;
  /** Chipped down by resolution; the layer is removed when it reaches zero.
   *  Uniform across kinds so the pipeline can apply DAMAGE without knowing the
   *  kind; what one point *means* is the behavior's business. */
  hits: number;
  /** Fixed at creation. The view divides by it to pick a stage of art, so one
   *  kind ships as a 1-hit or a 3-hit cover straight from level config. */
  maxHits: number;
};

export type TLayer = TPieceLayer | TBlockerLayer;
export type TLayerKind = TLayer["kind"];

/** A blocker before the pipeline stamps an id on it: what a level authors, and
 *  what a REPLACE outcome hands back. */
export type TBlockerSpec = { kind: TBlockerKind; hits: number };

/**
 * A playable cell as a stack, bottom to top: index 0 sits on the soil and the
 * last entry is what the player sees and taps. An empty array is bare soil.
 *
 * A cell absent from TGameState.board is still a hole — that encoding is
 * unchanged, which is why `canPlace` keeps testing for the cell's presence
 * before it looks at what is in it.
 */
export type TCell = { layers: TLayer[] };

export type TGoal = {
  type: AssetKey;
  target: number;
  progress: number;
};

/**
 * The single source of truth for a game in progress: everything the board, the
 * tray and the goal panel draw comes from here, and nothing else holds game
 * data. Owned by CGameStore and only ever changed through the functions in
 * rules.ts.
 */
export type TGameState = {
  level: number; // index into config.levels
  moves: number; // move counter shown in the HUD
  /** Carried and persisted, but no rule awards it yet — see rules.ts. */
  score: number;
  rows: number;
  columns: number;
  /** The level's piece pool, the source for tray refills. Copied from config
   *  rather than persisted, so config stays authoritative for level content. */
  pieces: readonly AssetKey[];
  /** Current PRNG state. Persisting this is what lets a restored save keep
   *  drawing the pieces the interrupted session would have drawn. */
  rng: number;
  nextPieceId: number;
  /** Counts layers rather than pieces. The two spaces never meet — the board
   *  keys piece views off TPiece.id and blocker views off TLayer.id, in
   *  separate maps — so they are free to overlap. */
  nextLayerId: number;
  goals: TGoal[];
  /** The playable cells, stacked or bare. Cells the level marks EMPTY are
   *  absent rather than empty-stacked — which is why `canPlace` tests `has`
   *  before it reads the value: a missing key is a hole, a cell with no layers
   *  is bare soil. */
  board: Map<CellId, TCell>;
  /** Left to right as drawn: index 0 is the newest arrival, the last entry is
   *  the one the next placement takes. */
  tray: TPiece[];
};
