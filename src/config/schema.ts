import { z } from "zod";
import type { AssetKey } from "../assetpack/assets";

const cellSchema = z.object({
  type: z.enum(["FILLED", "EMPTY"]).default("FILLED"),
});

const goalSchema = z.object({
  type: z.custom<AssetKey>((v) => typeof v === "string"),
  count: z.number().int().min(1),
});

const levelSchema = z.object({
  data: z.array(cellSchema),
  columns: z.number().min(1),
  goals: z.array(goalSchema).max(4).default([]),
  pieces: z.array(z.string() as z.ZodType<AssetKey>).min(1),
});

export const configSchema = z.object({
  width: z.number().min(1).default(1080),
  height: z.number().min(1).default(1920),
  levels: z.array(levelSchema),
});
export type TConfig = z.infer<typeof configSchema>;
export type TConfigInput = z.input<typeof configSchema>;
