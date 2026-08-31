import { Container, Graphics, Text } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { createPulseRing, drawPulseRing } from "./pulse";
import type { TPoint } from "./fx";
import {
  COLOR_FONT_FILL_BROWN,
  COLOR_PANEL_BORDER,
  COLOR_PANEL_FILL,
} from "../colors";
import config from "../config";

const HINT_HEIGHT = 72;

// A non-modal guide: a pulsing ring over the one allowed target and a hint
// pill above the tray. Input stays live; the controller gates the actions.
export class CTutorialCoach extends CContainer {
  private readonly ring = createPulseRing(0);
  private readonly hintPill = new Container();
  private readonly hintBackground = new Graphics();
  private readonly hintText: Text;
  private drawnRadius = 0;

  constructor(hintY: number) {
    super();

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

  setTarget(at: TPoint, radius: number) {
    if (radius !== this.drawnRadius) {
      this.drawnRadius = radius;
      drawPulseRing(this.ring, radius);
    }
    this.ring.position.set(at.x, at.y);
    this.ring.visible = true;
  }

  setHint(text: string) {
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
