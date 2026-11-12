import type { AssetKey } from "../../assetpack/assets";
import type { CellId } from "../id";

export type TCropState = "SEED" | "GROWING" | "SUPPLY";

export type TPiece = {
  id: number;
  assetKey: AssetKey;
  type: TCropState;
  startingValue: number;
  currentValue: number;
  rocked?: boolean;
};

export type TScriptEntry = { piece: AssetKey; value: number };

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
  script: readonly TScriptEntry[];
  scriptIndex: number;
  rng: number;
  nextPieceId: number;
  goals: TGoal[];
  board: Map<CellId, TCell>;
  tray: TPiece[];
};

export type TEffect =
  | { type: "PIECE_PLACED"; cell: CellId; pieceId: number }
  | { type: "SPROUTED"; cell: CellId; pieceId: number; value: number }
  | {
      type: "FED";
      from: CellId;
      to: CellId;
      supplyId: number;
      targetId: number;
      assetKey: AssetKey;
      amount: number;
      remaining: number;
    }
  | {
      type: "HARVESTED";
      cell: CellId;
      pieceId: number;
      assetKey: AssetKey;
      crop: "GROWING" | "SUPPLY";
    }
  | { type: "ROCK_BROKEN"; cell: CellId; pieceId: number }
  | { type: "SCORED"; amount: number; total: number }
  | { type: "MILESTONE_REACHED"; index: number }
  | { type: "LEVEL_WON"; milestones: number }
  | { type: "LEVEL_FAILED" };

export type TMoveReport = { moves: number; effects: TEffect[] };
