import { Sprite, Text, Texture } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import type { TPiece } from "../model/types";

export const CPIECE_WIDTH = 80;
export const CPIECE_HEIGHT = 80;

export class CPiece extends CContainer<{
  sprite: Sprite;
  value: Text;
}> {
  readonly id: number;
  private drawnValue: number;

  constructor(piece: TPiece) {
    super();

    this.id = piece.id;
    this.drawnValue = piece.currentValue;

    const sprite = new Sprite(getAsset<Texture>(piece.assetKey));
    sprite.anchor.set(0.5);
    const scale = Math.min(
      CPIECE_WIDTH / sprite.width,
      CPIECE_HEIGHT / sprite.height,
    );
    sprite.scale.set(scale);
    this.addNamedChild("sprite", sprite);

    const text = new Text({
      text: piece.currentValue,
      style: {
        fill: "#ffffff",
        stroke: { color: "#3d3d3d", width: 4 },
        fontSize: 52,
        fontFamily: getAsset<FontFace>("Baloo2-Regular").family,
      },
    });
    text.anchor.set(0.5);
    this.addNamedChild("value", text);
  }

  sync(piece: TPiece) {
    if (piece.currentValue === this.drawnValue) return;
    this.drawnValue = piece.currentValue;
    this.getChildByLabel("value").text = piece.currentValue;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
