import { Assets } from "pixi.js";
import type { AssetKey } from "../assetpack/assets";

export const getAsset = <T>(key: AssetKey): T => Assets.get<T>(key);
