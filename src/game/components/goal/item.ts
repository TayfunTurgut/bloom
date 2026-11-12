import { Sprite, Text, Texture, type PointData } from "pixi.js";
import { CContainer } from "../../../engine/container";
import { COLOR_FONT_FILL_LIGHT, COLOR_FONT_STROKE_GRAY } from "../../colors";
import { getAsset } from "../../assets";
import { bump, tween } from "../motion";
import { goalRemaining, isGoalComplete } from "../../model/rules";
import type { AssetKey } from "../../../assetpack/assets";
import type { TGoal } from "../../model/types";

const TICK_DURATION = 0.25;

export class CGoalItem extends CContainer<{
  background: Sprite;
  goalImage: Sprite;
  goalText: Text;
  tickMark: Sprite;
}> {
  readonly type: AssetKey;
  private drawnRemaining: number;
  private textScale = 1;
  private tickScale = 1;

  constructor(goal: TGoal) {
    super();

    this.type = goal.type;
    this.drawnRemaining = goalRemaining(goal);
    this.createBackground();
    this.createGoalText(goal);
    this.createTickMark();
    this.createGoalImage(goal);
  }

  render(goal: TGoal) {
    const remaining = goalRemaining(goal);
    const text = this.getChildByLabel("goalText");
    const tick = this.getChildByLabel("tickMark");
    const complete = isGoalComplete(goal);
    text.text = remaining;
    if (remaining !== this.drawnRemaining) {
      this.drawnRemaining = remaining;
      bump(text, this.textScale);
    }
    if (complete && !tick.visible) {
      tween(0, 1, {
        duration: TICK_DURATION,
        ease: "backOut",
        onUpdate: (t) => {
          if (!tick.destroyed) tick.scale.set(this.tickScale * t);
        },
      });
    }
    tick.visible = complete;
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
    this.textScale = 1.4;
    text.scale.set(this.textScale);
    text.position.set(0, -background.height * 0.33);
    this.addNamedChild("goalText", text);
  }

  private createTickMark() {
    const goalText = this.getChildByLabel("goalText");
    const texture = getAsset<Texture>("btn-check");
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    this.tickScale = (goalText.height / sprite.height) * 0.8;
    sprite.scale.set(this.tickScale);
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
