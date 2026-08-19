import { TilingSprite, type Application, type Texture } from "pixi.js";
import { getAsset } from "../assets";
import { onResize } from "../../engine/resize";

export const createBackground = (app: Application): TilingSprite => {
  const texture = getAsset<Texture>("background_seamless");
  texture.source.addressMode = "repeat";
  const sprite = new TilingSprite({ texture });
  sprite.tileScale.set(0.5);
  onResize(
    app,
    (w, h) => {
      sprite.width = w;
      sprite.height = h;
    },
    sprite,
  );
  return sprite;
};
