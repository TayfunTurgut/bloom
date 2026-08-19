import type { AssetKey } from "../../assetpack/assets";
import type { CellId } from "../id";

export type TFlowerType = "SEED" | "BLOOM" | "SUPPLY";

export type TPiece = {
  id: number;
  assetKey: AssetKey;
  type: TFlowerType;
  startingValue: number;
  currentValue: number;
};

export type TCell = { piece: TPiece | null };

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
  goals: TGoal[];
  board: Map<CellId, TCell>;
  tray: TPiece[];
};

export type TEffect =
  | { type: "PIECE_PLACED"; cell: CellId; pieceId: number }
  | { type: "BLOOMED"; cell: CellId; pieceId: number; value: number }
  | {
      type: "DRAINED";
      from: CellId;
      to: CellId;
      supplyId: number;
      targetId: number;
      assetKey: AssetKey;
      amount: number;
      remaining: number;
    }
  | {
      type: "POPPED";
      cell: CellId;
      pieceId: number;
      assetKey: AssetKey;
      flower: "BLOOM" | "SUPPLY";
    }
  | { type: "SCORED"; amount: number; total: number }
  | { type: "MILESTONE_REACHED"; index: number }
  | { type: "TRAY_SWAPPED"; a: number; b: number }
  | { type: "LEVEL_WON"; milestones: number }
  | { type: "LEVEL_FAILED" };

export type TMoveReport = { moves: number; effects: TEffect[] };
