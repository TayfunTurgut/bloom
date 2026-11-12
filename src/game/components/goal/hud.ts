import { CircularProgressBar } from "@pixi/ui";
import { Sprite, Text, type PointData, type Texture } from "pixi.js";
import { CContainer } from "../../../engine/container";
import { getAsset } from "../../assets";
import { bump, tween, type TAnimation } from "../motion";
import {
  COLOR_FONT_FILL_LIGHT,
  COLOR_FONT_STROKE_GRAY,
  COLOR_GOAL_PROGRESS_BACKGROUND,
  COLOR_GOAL_PROGRESS_FILL,
} from "../../colors";
import { milestoneThresholds, scoreMax } from "../../model/rules";
import type { TGameState } from "../../model/types";

const RING_RADIUS = 96;
const RING_WIDTH = 14;
const PIP_SCALE = 1.4;
const RING_FILL_DURATION = 0.3;

export class CGoalHud extends CContainer<{
  background: Sprite;
  moveCounter: Text;
}> {
  private ring!: CircularProgressBar;
  private readonly pips: Sprite[] = [];
  private readonly pipFilled: boolean[] = [];
  private ringTarget = 0;
  private ringFill: TAnimation | null = null;

  constructor(state: TGameState) {
    super();

    this.createRing();
    this.createBackground();
    this.createMoveCounter();
    this.createPips(state);
  }

  render(state: TGameState) {
    this.getChildByLabel("moveCounter").text = state.moves;
    const max = scoreMax(state);
    this.fillRingTo(max > 0 ? (state.score / max) * 100 : 0);
    milestoneThresholds(state).forEach((threshold, index) => {
      const pip = this.pips[index];
      if (!pip) return;
      const filled = state.score >= threshold;
      pip.texture = getAsset<Texture>(
        filled ? "leaf-icon-full" : "leaf-icon-empty",
      );
      if (filled && !this.pipFilled[index]) bump(pip, PIP_SCALE);
      this.pipFilled[index] = filled;
    });
  }

  private fillRingTo(target: number) {
    if (target === this.ringTarget) return;
    this.ringTarget = target;
    this.ringFill?.stop();
    this.ringFill = tween(this.ring.progress, target, {
      duration: RING_FILL_DURATION,
      ease: "easeOut",
      onUpdate: (value) => {
        if (!this.ring.destroyed) this.ring.progress = value;
      },
    });
  }

  pipGlobalPosition(index: number): PointData {
    const pip = this.pips[index];
    return pip ? pip.getGlobalPosition() : { x: 0, y: 0 };
  }

  private createRing() {
    this.ring = new CircularProgressBar({
      backgroundColor: COLOR_GOAL_PROGRESS_BACKGROUND,
      backgroundAlpha: 1,
      fillColor: COLOR_GOAL_PROGRESS_FILL,
      fillAlpha: 1,
      radius: RING_RADIUS,
      lineWidth: RING_WIDTH,
      value: 0,
      cap: "round",
    });
    this.container.addChild(this.ring);
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
        fill: COLOR_FONT_FILL_LIGHT,
        stroke: {
          color: COLOR_FONT_STROKE_GRAY,
          width: 8,
        },
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.position.set(0, -background.height * 0.025);
    this.addNamedChild("moveCounter", text);
  }

  private createPips(state: TGameState) {
    const max = scoreMax(state);
    for (const threshold of milestoneThresholds(state)) {
      const fraction = max > 0 ? threshold / max : 1;
      const angle = (-90 + 360 * fraction) * (Math.PI / 180);
      const pip = new Sprite(getAsset<Texture>("leaf-icon-empty"));
      pip.anchor.set(0.5);
      pip.scale.set(PIP_SCALE);
      pip.position.set(
        Math.cos(angle) * RING_RADIUS,
        Math.sin(angle) * RING_RADIUS,
      );
      this.pips.push(pip);
      this.pipFilled.push(state.score >= threshold);
      this.container.addChild(pip);
    }
  }
}
