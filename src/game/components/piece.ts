import { Sprite, Text, Texture } from "pixi.js";
import { animate } from "motion";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import { CAnimations } from "./motion";
import type { AssetKey } from "../../assetpack/assets";
import type { TFlowerType, TPiece } from "../model/types";

export const CPIECE_WIDTH = 80;
export const CPIECE_HEIGHT = 80;

const SUPPLY_TINT = 0x777777;

export class CPiece extends CContainer<{
  sprite: Sprite;
  vine: Sprite;
  value: Text;
}> {
  readonly id: number;
  private drawnValue: number;
  private drawnType: TFlowerType;
  private readonly animations = new CAnimations();

  constructor(piece: TPiece) {
    super();

    this.id = piece.id;
    this.drawnValue = piece.currentValue;
    this.drawnType = piece.type;

    const sprite = new Sprite(getAsset<Texture>(piece.assetKey));
    sprite.anchor.set(0.5);
    const scale = Math.min(
      CPIECE_WIDTH / sprite.width,
      CPIECE_HEIGHT / sprite.height,
    );
    sprite.scale.set(scale);
    this.addNamedChild("sprite", sprite);

    const vine = new Sprite(
      getAsset<Texture>(vineTextureFor(piece.currentValue)),
    );
    vine.anchor.set(0.5);
    this.addNamedChild("vine", vine);

    const text = new Text({
      text: piece.currentValue,
      style: {
        fill: "#ffffff",
        stroke: { color: "#4a2f18", width: 6 },
        fontSize: 34,
        fontFamily: getAsset<FontFace>("Baloo2-Bold").family,
        fontWeight: "bold",
      },
    });
    text.anchor.set(0.5);
    text.position.set(-CPIECE_WIDTH * 0.5 + 8, -CPIECE_HEIGHT * 0.5 + 8);
    this.addNamedChild("value", text);

    this.apply(piece);
  }

  sync(piece: TPiece) {
    const becameBloom = piece.type === "BLOOM" && this.drawnType !== "BLOOM";
    const valueChanged = piece.currentValue !== this.drawnValue;
    this.drawnType = piece.type;
    this.drawnValue = piece.currentValue;
    this.apply(piece);
    if (becameBloom || (valueChanged && piece.type === "BLOOM")) {
      this.popValue();
    }
  }

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }

  private apply(piece: TPiece) {
    const sprite = this.getChildByLabel("sprite");
    const vine = this.getChildByLabel("vine");
    const text = this.getChildByLabel("value");

    sprite.tint = piece.type === "SUPPLY" ? SUPPLY_TINT : 0xffffff;
    vine.visible = piece.type === "BLOOM" && piece.currentValue > 0;
    if (vine.visible) {
      vine.texture = getAsset<Texture>(vineTextureFor(piece.currentValue));
      vine.setSize(CCELL_WIDTH, CCELL_HEIGHT);
    }
    text.visible = piece.type !== "SUPPLY";
    text.text = piece.currentValue;
  }

  private popValue() {
    const text = this.getChildByLabel("value");
    const controls = animate(0, 1, {
      duration: 0.35,
      ease: "easeOut",
      onUpdate: (t) => {
        text.scale.set(1 + Math.sin(Math.PI * t) * 0.5);
      },
    });
    this.animations.track(controls);
  }
}

const vineTextureFor = (value: number): AssetKey => {
  if (value >= 10) return "block0";
  if (value >= 7) return "block1";
  if (value >= 4) return "block2";
  return "block3";
};
