import { z } from "zod";

export const saveStateSchema = z.object({
  level: z.number().int().min(0).default(0),
});
export type TSaveState = z.infer<typeof saveStateSchema>;
