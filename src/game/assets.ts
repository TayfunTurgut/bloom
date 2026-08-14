import { Assets } from "pixi.js";
import type { AssetKey } from "../assetpack/assets";

/**
 * Typed wrapper around `Assets.get` that narrows the key to `AssetKey`.
 *
 * `Assets.get` itself can't be narrowed via module augmentation — pixi's
 * `get(keys: string)` overload always survives the merge and collapses the
 * key type back to `string`, killing autocomplete. This wrapper takes the key
 * as `AssetKey` directly, so you get literal autocomplete and typo checking.
 */
export const getAsset = <T>(key: AssetKey): T => Assets.get<T>(key);
