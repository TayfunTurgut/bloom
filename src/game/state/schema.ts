import { z } from "zod";
import type { AssetKey } from "../../assetpack/assets";
import { DEFAULT_SKIN_ID } from "../config/skins";

export const SAVE_VERSION = 6;

const assetKeySchema = z.custom<AssetKey>((v) => typeof v === "string");

const pieceSchema = z.object({
  id: z.number().int().min(1),
  assetKey: assetKeySchema,
  type: z.enum(["SEED", "GROWING", "SUPPLY"]),
  startingValue: z.number().int().min(1),
  currentValue: z.number().int().min(0),
  rocked: z.boolean().optional(),
});

const goalSchema = z.object({
  type: assetKeySchema,
  target: z.number().int().min(1),
  progress: z.number().int().min(0),
});

export const saveStateSchema = z.object({
  version: z.literal(SAVE_VERSION),
  level: z.number().int().min(0),
  skin: z.string(),
  moves: z.number().int().min(0),
  score: z.number().int().min(0),
  rng: z.number().int(),
  nextPieceId: z.number().int().min(1),
  scriptIndex: z.number().int().min(0),
  goals: z.array(goalSchema),
  columns: z.number().int().min(1),
  board: z.array(pieceSchema.nullable()),
  tray: z.array(pieceSchema),
});

export type TSaveState = z.infer<typeof saveStateSchema>;
export type TPieceSnapshot = z.infer<typeof pieceSchema>;

export const emptySaveState = (): TSaveState => ({
  version: SAVE_VERSION,
  level: 0,
  skin: DEFAULT_SKIN_ID,
  moves: 0,
  score: 0,
  rng: 0,
  nextPieceId: 1,
  scriptIndex: 0,
  goals: [],
  columns: 1,
  board: [],
  tray: [],
});
