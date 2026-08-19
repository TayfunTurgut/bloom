import { z } from "zod";
import { getStorage, setStorage } from "../../engine/storage";

export const PROFILE_VERSION = 1;

export const profileSchema = z.object({
  version: z.literal(PROFILE_VERSION),
  leaves: z.number().int().min(0),
});

export type TProfile = z.infer<typeof profileSchema>;

const STORAGE_KEY = "bloom:profile";

export const emptyProfile = (): TProfile => ({
  version: PROFILE_VERSION,
  leaves: 0,
});

export const loadProfile = (): TProfile =>
  getStorage(STORAGE_KEY, profileSchema, emptyProfile());

export const saveProfile = (profile: TProfile): void =>
  setStorage(STORAGE_KEY, profileSchema, profile);
