import type { AssetKey } from "../../assetpack/assets";
import type { CellId } from "../id";

export type TFlowerType = "BLOOM" | "SUPPLY";

export type TPiece = {
  id: number;
  assetKey: AssetKey;
  type: TFlowerType;
  startingValue: number;
  currentValue: number;
};

export const BLOCKER_KINDS = ["VINE", "STONE"] as const;
export type TBlockerKind = (typeof BLOCKER_KINDS)[number];

type TLayerBase = { id: number };

export type TPieceLayer = TLayerBase & { kind: "PIECE"; piece: TPiece };

export type TBlockerLayer = TLayerBase & {
  kind: TBlockerKind;
  hits: number;
  maxHits: number;
};

export type TLayer = TPieceLayer | TBlockerLayer;
export type TLayerKind = TLayer["kind"];

export type TBlockerSpec = { kind: TBlockerKind; hits: number };

export type TCell = { layers: TLayer[] };

export type TGoal = {
  type: AssetKey;
  target: number;
  progress: number;
};

export type TGameState = {
  level: number;
  moves: number;
  score: number;
  rows: number;
  columns: number;
  pieces: readonly AssetKey[];
  rng: number;
  nextPieceId: number;
  nextLayerId: number;
  goals: TGoal[];
  board: Map<CellId, TCell>;
  tray: TPiece[];
};
