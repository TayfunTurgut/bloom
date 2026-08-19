import { z } from "zod";
import type { AssetKey } from "../../assetpack/assets";

const assetKeySchema = z.custom<AssetKey>((v) => typeof v === "string");

const cellSchema = z.object({
  type: z.enum(["FILLED", "EMPTY"]).default("FILLED"),
  piece: assetKeySchema.optional(),
  value: z.number().int().min(1).max(12).optional(),
});

const goalSchema = z.object({
  type: assetKeySchema,
  count: z.number().int().min(1),
});

const levelSchema = z
  .object({
    data: z.array(cellSchema).min(1),
    columns: z.number().int().min(1),
    goals: z.array(goalSchema).min(1).max(4),
    pieces: z.array(z.string() as z.ZodType<AssetKey>).min(1),
  })
  .refine((level) => level.data.length % level.columns === 0, {
    error:
      "data length must be a whole multiple of columns, or the derived row count is fractional",
  })
  .refine(
    (level) =>
      level.data.every(
        (cell) =>
          cell.type !== "EMPTY" ||
          (cell.piece === undefined && cell.value === undefined),
      ),
    { error: "an EMPTY cell is a hole and cannot hold a piece or a value" },
  )
  .refine(
    (level) =>
      level.data.every(
        (cell) => !cell.piece || level.pieces.includes(cell.piece),
      ),
    { error: "a cell's piece must come from the level's piece pool" },
  )
  .refine(
    (level) =>
      level.data.every(
        (cell) => cell.value === undefined || cell.piece !== undefined,
      ),
    { error: "a cell value needs a piece to carry it" },
  )
  .refine(
    (level) => level.goals.every((goal) => level.pieces.includes(goal.type)),
    { error: "a goal's type must come from the level's piece pool" },
  );

export const configSchema = z.object({
  width: z.number().min(1).default(1080),
  height: z.number().min(1).default(1920),
  levels: z.array(levelSchema),
});
export type TConfig = z.infer<typeof configSchema>;
export type TConfigInput = z.input<typeof configSchema>;
