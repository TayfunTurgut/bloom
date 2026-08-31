import { z } from "zod";
import { setStorage } from "../../engine/storage";
import { DEFAULT_SKIN_ID } from "../config/skins";

export const PROFILE_VERSION = 4;

const endlessSchema = z.object({
  order: z.array(z.number().int().min(0)),
  pos: z.number().int().min(0),
});

export const profileSchema = z.object({
  version: z.literal(PROFILE_VERSION),
  leaves: z.number().int().min(0),
  ownedSkins: z.array(z.string()),
  selectedSkin: z.string(),
  tutorialDone: z.boolean(),
  musicOn: z.boolean(),
  sfxOn: z.boolean(),
  endless: endlessSchema.nullable(),
});

export type TProfile = z.infer<typeof profileSchema>;

const legacyV1Schema = z.object({
  version: z.literal(1),
  leaves: z.number().int().min(0),
});

const legacyV2Schema = z.object({
  version: z.literal(2),
  leaves: z.number().int().min(0),
  ownedSkins: z.array(z.string()),
  selectedSkin: z.string(),
  tutorialsSeen: z.array(z.number().int().min(0)),
  endless: endlessSchema.nullable(),
});

const legacyV3Schema = z.object({
  version: z.literal(3),
  leaves: z.number().int().min(0),
  ownedSkins: z.array(z.string()),
  selectedSkin: z.string(),
  tutorialsSeen: z.array(z.string()),
  endless: endlessSchema.nullable(),
});

const STORAGE_KEY = "sprout:profile";

export const emptyProfile = (): TProfile => ({
  version: PROFILE_VERSION,
  leaves: 0,
  ownedSkins: [DEFAULT_SKIN_ID],
  selectedSkin: DEFAULT_SKIN_ID,
  tutorialDone: false,
  musicOn: true,
  sfxOn: true,
  endless: null,
});

// The popup lessons taught their topics one at a time, so a player who saw
// some of them may never have met the swap. tutorialDone stays false and the
// guided tutorial offers itself again — it only ever shows on the first
// level, which a player past it never revisits.
const fromLegacy = (
  legacy: z.infer<typeof legacyV2Schema> | z.infer<typeof legacyV3Schema>,
): TProfile => ({
  version: PROFILE_VERSION,
  leaves: legacy.leaves,
  ownedSkins: legacy.ownedSkins,
  selectedSkin: legacy.selectedSkin,
  tutorialDone: false,
  musicOn: true,
  sfxOn: true,
  endless: legacy.endless,
});

export const loadProfile = (): TProfile => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const current = profileSchema.safeParse(parsed);
      if (current.success) return current.data;
      const v3 = legacyV3Schema.safeParse(parsed);
      if (v3.success) return fromLegacy(v3.data);
      const v2 = legacyV2Schema.safeParse(parsed);
      if (v2.success) return fromLegacy(v2.data);
      const v1 = legacyV1Schema.safeParse(parsed);
      if (v1.success) return { ...emptyProfile(), leaves: v1.data.leaves };
    } catch {}
  }
  return emptyProfile();
};

export const saveProfile = (profile: TProfile): void =>
  setStorage(STORAGE_KEY, profileSchema, profile);
