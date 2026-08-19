import { Sprite, Text, Texture, type PointData } from "pixi.js";
import { animate } from "motion";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { CAnimations } from "./motion";
import { COLOR_FONT_FILL_GRAY, COLOR_FONT_STROKE_GRAY } from "../colors";

const COUNTER_X = 560;
const REST_Y = -60;
const SHOWN_Y = 150;
const LEAF_SIZE = 44;
const HOLD_DURATION = 0.9;

type TEase = "linear" | "easeIn" | "easeOut" | "easeInOut" | "backOut";

export class CLeafCounter extends CContainer<{
  pill: Sprite;
  count: Text;
}> {
  private readonly animations = new CAnimations();
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;

  constructor(leaves: number) {
    super();

    const pill = new Sprite(getAsset<Texture>("leaf-icon-and-bg"));
    pill.anchor.set(0.5);
    this.addNamedChild("pill", pill);

    const text = new Text({
      text: leaves,
      style: {
        fontFamily: getAsset<FontFace>("Baloo2-Bold").family,
        fontWeight: "bold",
        fontSize: 40,
        fill: COLOR_FONT_FILL_GRAY,
        stroke: { color: COLOR_FONT_STROKE_GRAY, width: 6 },
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.position.set(pill.width * 0.14, 0);
    this.addNamedChild("count", text);

    this.container.position.set(COUNTER_X, REST_Y);
  }

  setCount(total: number) {
    this.getChildByLabel("count").text = total;
  }

  award(newTotal: number, from: PointData) {
    this.pending += 1;
    this.queue = this.queue
      .then(() => this.run(newTotal, from))
      .catch(() => {})
      .finally(() => {
        this.pending -= 1;
      });
  }

  private async run(newTotal: number, from: PointData) {
    const parent = this.container.parent;
    if (!parent || this.container.destroyed) return;

    await this.slide(SHOWN_Y);

    const leaf = new Sprite(getAsset<Texture>("leaf-icon"));
    leaf.anchor.set(0.5);
    const scale = LEAF_SIZE / Math.max(leaf.width, leaf.height);
    leaf.scale.set(0);
    leaf.position.set(from.x, from.y);
    parent.addChild(leaf);

    await this.tween(0.25, "backOut", (t) => {
      if (!leaf.destroyed) leaf.scale.set(scale * t);
    });
    const startX = leaf.x;
    const startY = leaf.y;
    await this.tween(0.5, "easeIn", (t) => {
      if (leaf.destroyed) return;
      leaf.position.set(
        startX + (COUNTER_X - startX) * t,
        startY + (SHOWN_Y - startY) * t,
      );
    });
    leaf.destroy();

    this.setCount(newTotal);
    const count = this.getChildByLabel("count");
    await this.tween(0.25, "easeOut", (t) => {
      count.scale.set(1 + Math.sin(Math.PI * t) * 0.3);
    });

    await this.tween(HOLD_DURATION, "linear", () => {});
    if (this.pending <= 1) await this.slide(REST_Y);
  }

  private slide(toY: number): Promise<void> {
    const fromY = this.container.y;
    if (fromY === toY) return Promise.resolve();
    return this.tween(0.3, "easeInOut", (t) => {
      this.container.position.set(COUNTER_X, fromY + (toY - fromY) * t);
    });
  }

  private tween(
    duration: number,
    ease: TEase,
    onUpdate: (t: number) => void,
  ): Promise<void> {
    return new Promise((resolve) => {
      const controls = animate(0, 1, { duration, ease, onUpdate });
      this.animations.track(controls, resolve);
    });
  }
}
