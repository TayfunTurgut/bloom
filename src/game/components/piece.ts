import { Sprite, Text, Texture } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { CCELL_GAP, CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import { CAnimations, tween } from "./motion";
import type { AssetKey } from "../../assetpack/assets";
import type { TCropState, TPiece } from "../model/types";

export const CPIECE_WIDTH = 80;
export const CPIECE_HEIGHT = 80;
const CROP_BASELINE_Y = CPIECE_HEIGHT * 0.5;

const SUPPLY_TINT = 0x777777;

export class CPiece extends CContainer<{
  sprite: Sprite;
  growth: Sprite;
  value: Text;
}> {
  readonly id: number;
  private drawnValue: number;
  private drawnType: TCropState;
  private readonly animations = new CAnimations();

  constructor(piece: TPiece) {
    super();

    this.id = piece.id;
    this.drawnValue = piece.currentValue;
    this.drawnType = piece.type;

    const sprite = new Sprite(getAsset<Texture>(piece.assetKey));
    sprite.anchor.set(0.5, 1);
    const source = sprite.texture.orig;
    const scale = Math.min(
      CPIECE_WIDTH / source.width,
      CPIECE_HEIGHT / source.height,
    );
    sprite.scale.set(scale);
    sprite.position.set(0, CROP_BASELINE_Y);
    this.addNamedChild("sprite", sprite);

    const growth = new Sprite(
      getAsset<Texture>(growthTextureFor(piece.currentValue)),
    );
    growth.anchor.set(0.5);
    this.addNamedChild("growth", growth);

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

  showValue(value: number) {
    if (value === this.drawnValue) return;
    this.drawnValue = value;
    const growth = this.getChildByLabel("growth");
    growth.visible = this.drawnType === "GROWING" && value > 0;
    if (growth.visible) {
      growth.texture = getAsset<Texture>(growthTextureFor(value));
      growth.setSize(CCELL_WIDTH - CCELL_GAP, CCELL_HEIGHT - CCELL_GAP);
    }
    this.getChildByLabel("value").text = value;
    this.popValue();
  }

  sync(piece: TPiece) {
    const sprouted = piece.type === "GROWING" && this.drawnType !== "GROWING";
    const valueChanged = piece.currentValue !== this.drawnValue;
    this.drawnType = piece.type;
    this.drawnValue = piece.currentValue;
    this.apply(piece);
    if (sprouted || (valueChanged && piece.type === "GROWING")) {
      this.popValue();
    }
  }

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }

  private apply(piece: TPiece) {
    const sprite = this.getChildByLabel("sprite");
    const growth = this.getChildByLabel("growth");
    const text = this.getChildByLabel("value");

    sprite.tint = piece.type === "SUPPLY" ? SUPPLY_TINT : 0xffffff;
    growth.visible = piece.type === "GROWING" && piece.currentValue > 0;
    if (growth.visible) {
      growth.texture = getAsset<Texture>(growthTextureFor(piece.currentValue));
      growth.setSize(CCELL_WIDTH - CCELL_GAP, CCELL_HEIGHT - CCELL_GAP);
    }
    text.visible = piece.type !== "SUPPLY";
    text.text = piece.currentValue;
  }

  private popValue() {
    const text = this.getChildByLabel("value");
    const controls = tween(0, 1, {
      duration: 0.35,
      ease: "easeOut",
      onUpdate: (t) => {
        text.scale.set(1 + Math.sin(Math.PI * t) * 0.5);
      },
    });
    this.animations.track(controls);
  }
}

const growthTextureFor = (value: number): AssetKey => {
  if (value >= 10) return "block0";
  if (value >= 7) return "block1";
  if (value >= 4) return "block2";
  return "block3";
};
