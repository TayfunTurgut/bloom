import { Sprite, Text, type Texture } from "pixi.js";
import { CContainer } from "../../../engine/container";
import { getAsset } from "../../assets";
import { COLOR_FONT_FILL_GRAY, COLOR_FONT_STROKE_GRAY } from "../../colors";

export class CGoalHud extends CContainer<{
  background: Sprite;
  moveCounter: Text;
}> {
  constructor() {
    super();

    this.createBackground();
    this.createMoveCounter();
  }

  render(moves: number) {
    this.getChildByLabel("moveCounter").text = moves;
  }

  private createBackground() {
    const texture = getAsset<Texture>("badges/disc_brown");
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    sprite.scale.set(0.5);
    this.addNamedChild("background", sprite);
  }

  private createMoveCounter() {
    const font = getAsset<FontFace>("Baloo2-Regular");
    const text = new Text({
      text: 0,
      style: {
        fontFamily: font.family,
        fontSize: 64,
        fill: COLOR_FONT_FILL_GRAY,
        stroke: {
          color: COLOR_FONT_STROKE_GRAY,
          width: 8,
        },
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.scale.set(2);
    this.addNamedChild("moveCounter", text);
  }
}
