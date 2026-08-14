import { Sprite, Text, Texture } from "pixi.js";
import { CContainer } from "./common/container";
import { getAsset } from "../utils/assets";
import type { AssetKey } from "../assetpack/assets";

export const CPIECE_WIDTH = 80;
export const CPIECE_HEIGHT = 80;

export enum EFlowerType {
  BLOOM,
  SUPPLY,
}

export class CPiece extends CContainer<{
  sprite: Sprite;
  value: Text;
}> {
  type = EFlowerType.BLOOM;
  readonly assetKey: AssetKey;
  startingValue: number;
  private _currentValue: number;

  constructor(assetKey: AssetKey, value: number) {
    super();

    this.assetKey = assetKey;
    this.startingValue = value;
    this._currentValue = value;

    const sprite = new Sprite(getAsset<Texture>(assetKey));
    sprite.anchor.set(0.5);
    const scale = Math.min(
      CPIECE_WIDTH / sprite.width,
      CPIECE_HEIGHT / sprite.height,
    );
    sprite.scale.set(scale);
    this.addNamedChild("sprite", sprite);

    const text = new Text();
    this.addNamedChild("value", text);

    this.updateText(text);
  }

  private updateText(text: Text) {
    text.text = this.currentValue;
    text.style = {
      fill: "#ffffff",
      stroke: { color: "#3d3d3d", width: 4 },
      fontSize: 52,
      fontFamily: "Inter",
    };
    text.anchor.set(0.5);
  }

  get currentValue() {
    return this._currentValue;
  }

  set currentValue(value: number) {
    this._currentValue = value;
    this.updateText(this.getChildByLabel("value"));
  }
}
