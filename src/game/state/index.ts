import {
  emptySaveState,
  readSaveStateSchema,
  saveStateSchema,
  type TSaveState,
} from "./schema";
import { getStorage, setStorage } from "../../engine/storage";

const STORAGE_KEY = "sprout:save";

export const loadSaveState = (): TSaveState =>
  getStorage(STORAGE_KEY, readSaveStateSchema, emptySaveState());

export const saveSaveState = (state: TSaveState): void =>
  setStorage(STORAGE_KEY, saveStateSchema, state);
