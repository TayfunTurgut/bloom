import { Container, Graphics, Text } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { now } from "./motion";
import {
  COLOR_FONT_FILL_BROWN,
  COLOR_GOAL_PROGRESS_FILL,
  COLOR_PANEL_BORDER,
  COLOR_PANEL_FILL,
} from "../colors";
import config from "../config";

const PULSE_PERIOD_MS = 1200;
const HINT_HEIGHT = 72;

export type TCoachPoint = { x: number; y: number };

// A non-modal guide: a pulsing ring over the one allowed target and a hint
// pill above the tray. Input stays live; the controller gates the actions.
export class CTutorialCoach extends CContainer {
  private readonly ring = new Graphics();
  private readonly hintPill = new Container();
  private readonly hintBackground = new Graphics();
  private readonly hintText: Text;
  private drawnRadius = 0;

  constructor(hintY: number) {
    super();

    // Untracked by CAnimations on purpose: an endless pulse must not stall
    // the idle() check that waits for activeCount to reach zero.
    this.ring.visible = false;
    this.ring.onRender = () => {
      if (!this.ring.visible) return;
      const t = (now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      const wave = Math.sin(t * Math.PI * 2);
      this.ring.alpha = 0.75 + 0.25 * wave;
      this.ring.scale.set(1 + 0.06 * wave);
    };
    this.container.addChild(this.ring);

    this.hintText = new Text({
      text: "",
      style: {
        fontFamily: getAsset<FontFace>("Baloo2-Bold").family,
        fontWeight: "bold",
        fontSize: 30,
        fill: COLOR_FONT_FILL_BROWN,
        align: "center",
      },
    });
    this.hintText.anchor.set(0.5);
    this.hintPill.addChild(this.hintBackground);
    this.hintPill.addChild(this.hintText);
    this.hintPill.position.set(config.width * 0.5, hintY);
    this.hintPill.visible = false;
    this.container.addChild(this.hintPill);

    this.container.eventMode = "none";
  }

  setTarget(at: TCoachPoint | null, radius: number) {
    if (!at) {
      this.ring.visible = false;
      return;
    }
    if (radius !== this.drawnRadius) {
      this.drawnRadius = radius;
      this.ring
        .clear()
        .circle(0, 0, radius)
        .fill({ color: COLOR_GOAL_PROGRESS_FILL, alpha: 0.15 })
        .circle(0, 0, radius)
        .stroke({ width: 8, color: COLOR_GOAL_PROGRESS_FILL });
    }
    this.ring.position.set(at.x, at.y);
    this.ring.visible = true;
  }

  setHint(text: string | null) {
    if (!text) {
      this.hintPill.visible = false;
      return;
    }
    if (this.hintText.text !== text) {
      this.hintText.text = text;
      const width = this.hintText.width + 56;
      this.hintBackground
        .clear()
        .roundRect(-width * 0.5, -HINT_HEIGHT * 0.5, width, HINT_HEIGHT, 24)
        .fill({ color: COLOR_PANEL_FILL })
        .stroke({ width: 6, color: COLOR_PANEL_BORDER });
    }
    this.hintPill.visible = true;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
