import { Sprite, Text, Texture, type PointData } from "pixi.js";
import { CContainer } from "../../../engine/container";
import { COLOR_FONT_FILL_LIGHT, COLOR_FONT_STROKE_GRAY } from "../../colors";
import { getAsset } from "../../assets";
import { goalRemaining, isGoalComplete } from "../../model/rules";
import type { AssetKey } from "../../../assetpack/assets";
import type { TGoal } from "../../model/types";

export class CGoalItem extends CContainer<{
  background: Sprite;
  goalImage: Sprite;
  goalText: Text;
  tickMark: Sprite;
}> {
  readonly type: AssetKey;

  constructor(goal: TGoal) {
    super();

    this.type = goal.type;
    this.createBackground();
    this.createGoalText(goal);
    this.createTickMark();
    this.createGoalImage(goal);
  }

  render(goal: TGoal) {
    this.getChildByLabel("goalText").text = goalRemaining(goal);
    this.getChildByLabel("tickMark").visible = isGoalComplete(goal);
  }

  globalPosition(): PointData {
    return this.getChildByLabel("goalImage").getGlobalPosition();
  }

  private createBackground() {
    const texture = getAsset<Texture>("pieces-needed-bg");
    const background = new Sprite(texture);
    background.anchor.set(0.5);
    this.addNamedChild("background", background);
  }

  private createGoalText(goal: TGoal) {
    const background = this.getChildByLabel("background");
    const font = getAsset<FontFace>("Baloo2-Regular");
    const text = new Text({
      text: goalRemaining(goal),
      style: {
        fontFamily: font.family,
        fontSize: 64,
        fill: COLOR_FONT_FILL_LIGHT,
        stroke: {
          color: COLOR_FONT_STROKE_GRAY,
          width: 8,
        },
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.scale.set(1.4);
    text.position.set(0, -background.height * 0.33);
    this.addNamedChild("goalText", text);
  }

  private createTickMark() {
    const goalText = this.getChildByLabel("goalText");
    const texture = getAsset<Texture>("btn-check");
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    const scale = goalText.height / sprite.height;
    sprite.scale.set(scale * 0.8);
    sprite.position.copyFrom(goalText.position);
    this.addNamedChild("tickMark", sprite);

    sprite.visible = false;
  }

  private createGoalImage(goal: TGoal) {
    const background = this.getChildByLabel("background");
    const texture = getAsset<Texture>(goal.type);
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    const scale = Math.min(
      (background.width * 0.8) / sprite.width,
      (background.height * 0.6) / sprite.height,
    );
    sprite.scale.set(scale);
    sprite.position.set(0, background.height * 0.075);
    this.addNamedChild("goalImage", sprite);
  }
}
