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
  goals: TGoal[];
  /** The playable cells, occupied or not. Cells the level marks EMPTY are
   *  absent rather than null — which is why `canPlace` tests `has` before it
   *  reads the value: a missing key is a hole, a null value is bare soil. */
  board: Map<CellId, TPiece | null>;
  /** Left to right as drawn: index 0 is the newest arrival, the last entry is
   *  the one the next placement takes. */
  tray: TPiece[];
};
