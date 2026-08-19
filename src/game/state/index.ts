import { emptySaveState, saveStateSchema, type TSaveState } from "./schema";
import { getStorage, setStorage } from "../../engine/storage";

const STORAGE_KEY = "sprout:save";

export const loadSaveState = (): TSaveState =>
  getStorage(STORAGE_KEY, saveStateSchema, emptySaveState());

export const saveSaveState = (state: TSaveState): void =>
  setStorage(STORAGE_KEY, saveStateSchema, state);
