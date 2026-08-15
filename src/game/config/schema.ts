import { z } from "zod";
import type { AssetKey } from "../../assetpack/assets";

const cellSchema = z.object({
  type: z.enum(["FILLED", "EMPTY"]).default("FILLED"),
});

const goalSchema = z.object({
  type: z.custom<AssetKey>((v) => typeof v === "string"),
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
  });

export const configSchema = z.object({
  width: z.number().min(1).default(1080),
  height: z.number().min(1).default(1920),
  levels: z.array(levelSchema),
});
export type TConfig = z.infer<typeof configSchema>;
export type TConfigInput = z.input<typeof configSchema>;
