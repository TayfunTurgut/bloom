import { z } from "zod";
import type { AssetKey } from "../../assetpack/assets";
import { BLOCKER_KINDS } from "../model/types";

const assetKeySchema = z.custom<AssetKey>((v) => typeof v === "string");

const blockerSchema = z.object({
  kind: z.enum(BLOCKER_KINDS),
  /** Doubles as maxHits, so a level tunes a cover's toughness without needing
   *  a second kind: {kind:"VINE"} is a one-hit vine, hits 3 a thick mat. */
  hits: z.number().int().min(1).default(1),
});

const cellSchema = z.object({
  type: z.enum(["FILLED", "EMPTY"]).default("FILLED"),
  /** A flower the level starts with in place — the vegetable under the vines.
   *  Its printed value is drawn from the seeded PRNG at build time, so a level
   *  is still reproducible from its seed. */
  piece: assetKeySchema.optional(),
  /** Covers over that flower, bottom to top, and empty for an ordinary cell —
   *  which is why every level authored before this existed still parses. */
  layers: z.array(blockerSchema).default([]),
});

const goalSchema = z.object({
  type: assetKeySchema,
  count: z.number().int().min(1),
});

const levelSchema = z
  .object({
    data: z.array(cellSchema).min(1),
    columns: z.number().int().min(1),
    /** At most four: the panel only has four slots — see components/goal/panel.ts. */
    goals: z.array(goalSchema).max(4).default([]),
    pieces: z.array(z.string() as z.ZodType<AssetKey>).min(1),
  })
  // The row count is derived as data.length / columns and never stored, so a
  // partial row makes it fractional. The board is then built with more cells
  // than the level declares, and fromSnapshot rejects every snapshot of it —
  // the level plays, but silently loses the save on each reload.
  .refine((level) => level.data.length % level.columns === 0, {
    error:
      "data length must be a whole multiple of columns, or the derived row count is fractional",
  })
  // A hole is skipped outright by createInitialState, so anything authored on
  // one would vanish without a word. Caught here rather than at play time.
  .refine(
    (level) =>
      level.data.every(
        (cell) =>
          cell.type !== "EMPTY" ||
          (cell.piece === undefined && cell.layers.length === 0),
      ),
    { error: "an EMPTY cell is a hole and cannot hold a piece or layers" },
  )
  // Only level.pieces is preloaded, so a flower authored outside that pool
  // would resolve to a missing texture — the same rule fromSnapshot enforces
  // on a restored save, applied to authored content.
  .refine(
    (level) =>
      level.data.every(
        (cell) => !cell.piece || level.pieces.includes(cell.piece),
      ),
    { error: "a cell's piece must come from the level's piece pool" },
  );

export const configSchema = z.object({
  width: z.number().min(1).default(1080),
  height: z.number().min(1).default(1920),
  levels: z.array(levelSchema),
});
export type TConfig = z.infer<typeof configSchema>;
export type TConfigInput = z.input<typeof configSchema>;
