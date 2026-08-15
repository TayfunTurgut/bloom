import { z } from "zod";
import type { AssetKey } from "../../assetpack/assets";

/** Bump when the shape changes: an older save then fails to parse and the
 *  player gets a fresh level instead of a half-understood one. */
export const SAVE_VERSION = 1;

const assetKeySchema = z.custom<AssetKey>((v) => typeof v === "string");

// currentValue is deliberately unbounded: a supply flower drains its target,
// which can take that target below zero.
const pieceSchema = z.object({
  id: z.number().int().min(1),
  assetKey: assetKeySchema,
  type: z.enum(["BLOOM", "SUPPLY"]),
  startingValue: z.number().int(),
  currentValue: z.number().int(),
});

const goalSchema = z.object({
  type: assetKeySchema,
  target: z.number().int().min(1),
  progress: z.number().int().min(0),
});

/** The whole game in progress, board and tray included — see model/serialize.ts. */
export const saveStateSchema = z.object({
  version: z.literal(SAVE_VERSION),
  level: z.number().int().min(0),
  moves: z.number().int().min(0),
  score: z.number().int().min(0),
  rng: z.number().int(),
  nextPieceId: z.number().int().min(1),
  goals: z.array(goalSchema),
  /** Recorded so a level reshaped to the same cell count — 3x3 into 9x1 —
   *  is caught rather than silently reinterpreted. */
  columns: z.number().int().min(1),
  /** Row-major, one entry per cell of the level. */
  board: z.array(pieceSchema.nullable()),
  tray: z.array(pieceSchema),
});

export type TSaveState = z.infer<typeof saveStateSchema>;
export type TPieceSnapshot = z.infer<typeof pieceSchema>;

/**
 * What a player with no save gets. Its empty board never matches a real
 * level's cell count, so `fromSnapshot` rejects it and a fresh game starts —
 * the same path an unreadable or outdated save takes.
 */
export const emptySaveState = (): TSaveState => ({
  version: SAVE_VERSION,
  level: 0,
  moves: 0,
  score: 0,
  rng: 0,
  nextPieceId: 1,
  goals: [],
  columns: 1,
  board: [],
  tray: [],
});
