import { Sprite, Text, Texture } from "pixi.js";
import { CContainer } from "../../../engine/container";
import { COLOR_FONT_FILL_GRAY, COLOR_FONT_STROKE_GRAY } from "../../colors";
import { getAsset } from "../../assets";
import type { AssetKey } from "../../../assetpack/assets";

type TGoalItemProps = {
  goalCount: number;
  goalType: AssetKey;
};

export class CGoalItem extends CContainer<{
  background: Sprite;
  goalImage: Sprite;
  goalText: Text;
  tickMark: Sprite;
}> {
  constructor(props: TGoalItemProps) {
    super();

    this.createBackground();
    this.createGoalText(props.goalCount);
    this.createTickMark();
    this.createGoalImage(props.goalType);
  }

  updateGoalCount(newGoalCount: number) {
    const goalText = this.getChildByLabel("goalText");
    goalText.text = newGoalCount;
  }

  setComplete(complete: boolean) {
    const tickMark = this.getChildByLabel("tickMark");
    tickMark.visible = complete;
  }

  private createBackground() {
    const texture = getAsset<Texture>("panels/rounded");
    const background = new Sprite(texture);
    background.anchor.set(0.5);
    this.addNamedChild("background", background);
  }

  private createGoalText(goalCount: number) {
    const background = this.getChildByLabel("background");
    const font = getAsset<FontFace>("Baloo2-Regular");
    const text = new Text({
      text: goalCount,
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
    text.scale.set(2.2);
    text.position.set(0, -background.height * 0.32);
    this.addNamedChild("goalText", text);
  }

  private createTickMark() {
    const goalText = this.getChildByLabel("goalText");
    const texture = getAsset<Texture>("badges/check_badge");
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    const scale = goalText.height / sprite.height;
    sprite.scale.set(scale * 0.8);
    sprite.position.copyFrom(goalText.position);
    this.addNamedChild("tickMark", sprite);

    sprite.visible = false;
  }

  private createGoalImage(goalType: AssetKey) {
    const background = this.getChildByLabel("background");
    const texture = getAsset<Texture>(goalType);
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    const scale = Math.min(
      (background.width * 0.8) / sprite.width,
      (background.height * 0.6) / sprite.height,
    );
    sprite.scale.set(scale);
    sprite.position.set(0, background.height * 0.05);
    this.addNamedChild("goalImage", sprite);
  }
}
