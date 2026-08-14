import { saveStateSchema, type TSaveState } from "./schema";
import { getStorage, setStorage } from "../../engine/storage";

const STORAGE_KEY = "bloom:save";

export const loadSaveState = (): TSaveState =>
  getStorage(STORAGE_KEY, saveStateSchema, saveStateSchema.parse({}));

export const saveSaveState = (state: TSaveState): void =>
  setStorage(STORAGE_KEY, saveStateSchema, state);
