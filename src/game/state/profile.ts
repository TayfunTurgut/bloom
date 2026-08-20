import { z } from "zod";
import { setStorage } from "../../engine/storage";
import { DEFAULT_SKIN_ID } from "../config/skins";

export const PROFILE_VERSION = 2;

const endlessSchema = z.object({
  order: z.array(z.number().int().min(0)),
  pos: z.number().int().min(0),
});

export const profileSchema = z.object({
  version: z.literal(PROFILE_VERSION),
  leaves: z.number().int().min(0),
  ownedSkins: z.array(z.string()),
  selectedSkin: z.string(),
  tutorialsSeen: z.array(z.number().int().min(0)),
  endless: endlessSchema.nullable(),
});

export type TProfile = z.infer<typeof profileSchema>;

const legacyProfileSchema = z.object({
  version: z.literal(1),
  leaves: z.number().int().min(0),
});

const STORAGE_KEY = "sprout:profile";

export const emptyProfile = (): TProfile => ({
  version: PROFILE_VERSION,
  leaves: 0,
  ownedSkins: [DEFAULT_SKIN_ID],
  selectedSkin: DEFAULT_SKIN_ID,
  tutorialsSeen: [],
  endless: null,
});

export const loadProfile = (): TProfile => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const current = profileSchema.safeParse(parsed);
      if (current.success) return current.data;
      const legacy = legacyProfileSchema.safeParse(parsed);
      if (legacy.success)
        return { ...emptyProfile(), leaves: legacy.data.leaves };
    } catch {}
  }
  return emptyProfile();
};

export const saveProfile = (profile: TProfile): void =>
  setStorage(STORAGE_KEY, profileSchema, profile);
