import { z } from "zod";
import type { AssetKey } from "../../assetpack/assets";
import { BLOCKER_KINDS } from "../model/types";

export const SAVE_VERSION = 2;

const assetKeySchema = z.custom<AssetKey>((v) => typeof v === "string");

const pieceSchema = z.object({
  id: z.number().int().min(1),
  assetKey: assetKeySchema,
  type: z.enum(["BLOOM", "SUPPLY"]),
  startingValue: z.number().int(),
  currentValue: z.number().int(),
});

const layerSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.number().int().min(1),
    kind: z.literal("PIECE"),
    piece: pieceSchema,
  }),
  z.object({
    id: z.number().int().min(1),
    kind: z.enum(BLOCKER_KINDS),
    hits: z.number().int().min(1),
    maxHits: z.number().int().min(1),
  }),
]);

const goalSchema = z.object({
  type: assetKeySchema,
  target: z.number().int().min(1),
  progress: z.number().int().min(0),
});

export const saveStateSchema = z.object({
  version: z.literal(SAVE_VERSION),
  level: z.number().int().min(0),
  moves: z.number().int().min(0),
  score: z.number().int().min(0),
  rng: z.number().int(),
  nextPieceId: z.number().int().min(1),
  nextLayerId: z.number().int().min(1),
  goals: z.array(goalSchema),
  columns: z.number().int().min(1),
  board: z.array(z.array(layerSchema)),
  tray: z.array(pieceSchema),
});

export type TSaveState = z.infer<typeof saveStateSchema>;
export type TPieceSnapshot = z.infer<typeof pieceSchema>;
export type TLayerSnapshot = z.infer<typeof layerSchema>;

export const emptySaveState = (): TSaveState => ({
  version: SAVE_VERSION,
  level: 0,
  moves: 0,
  score: 0,
  rng: 0,
  nextPieceId: 1,
  nextLayerId: 1,
  goals: [],
  columns: 1,
  board: [],
  tray: [],
});
