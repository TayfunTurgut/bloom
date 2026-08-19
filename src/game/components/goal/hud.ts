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
    const texture = getAsset<Texture>("score-movement-bg");
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    this.addNamedChild("background", sprite);
  }

  private createMoveCounter() {
    const background = this.getChildByLabel("background");
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
    text.position.set(0, -background.height * 0.025);
    this.addNamedChild("moveCounter", text);
  }
}
