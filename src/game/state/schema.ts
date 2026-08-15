import { z } from "zod";
import type { AssetKey } from "../../assetpack/assets";
import { BLOCKER_KINDS } from "../model/types";

/** Bump when the shape changes: an older save then fails to parse and the
 *  player gets a fresh level instead of a half-understood one. Went to 2 when
 *  a board cell became a stack of layers rather than one optional piece. */
export const SAVE_VERSION = 2;

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

/** Mirrors TLayer. The kind enum is built from BLOCKER_KINDS rather than
 *  spelled out, so a kind added to the union cannot be silently unsaveable. */
const layerSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.number().int().min(1),
    kind: z.literal("PIECE"),
    piece: pieceSchema,
  }),
  z.object({
    id: z.number().int().min(1),
    kind: z.enum(BLOCKER_KINDS),
    // Saved mid-move a cover can sit at zero for no longer than one call, so
    // anything persisted is still standing and has at least one hit left.
    hits: z.number().int().min(1),
    maxHits: z.number().int().min(1),
  }),
]);

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
  nextLayerId: z.number().int().min(1),
  goals: z.array(goalSchema),
  /** Recorded so a level reshaped to the same cell count — 3x3 into 9x1 —
   *  is caught rather than silently reinterpreted. */
  columns: z.number().int().min(1),
  /** Row-major, one stack per cell of the level. A hole and a bare cell both
   *  write an empty stack: the snapshot carries no board shape of its own,
   *  because fromSnapshot reads that back off the level. */
  board: z.array(z.array(layerSchema)),
  tray: z.array(pieceSchema),
});

export type TSaveState = z.infer<typeof saveStateSchema>;
export type TPieceSnapshot = z.infer<typeof pieceSchema>;
export type TLayerSnapshot = z.infer<typeof layerSchema>;

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
  nextLayerId: 1,
  goals: [],
  columns: 1,
  board: [],
  tray: [],
});
