import { Sprite, Text, Texture } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import type { TPiece } from "../model/types";

export const CPIECE_WIDTH = 80;
export const CPIECE_HEIGHT = 80;

/**
 * Draws one flower. Owns no game data: the piece it was built from lives in
 * the store, and `sync` re-reads it. `id` is kept only so the board and tray
 * can match their sprites back to the state they came from.
 */
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

  /** Pulls display state back in line with `piece`. */
  sync(piece: TPiece) {
    if (piece.currentValue === this.drawnValue) return;
    this.drawnValue = piece.currentValue;
    this.getChildByLabel("value").text = piece.currentValue;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
