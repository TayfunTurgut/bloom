import { Graphics, Sprite, Text, type Texture } from "pixi.js";
import { CContainer, type TNone } from "../../engine/container";
import { getAsset } from "../assets";
import { CAnimations, tween } from "./motion";
import {
  COLOR_FONT_FILL_BROWN,
  COLOR_PANEL_BORDER,
  COLOR_PANEL_FILL,
  COLOR_PANEL_SHADOW,
} from "../colors";
import config from "../config";
import type { TBodyLine, TLesson } from "./lessons";

export type TTutorialEvents = {
  "tutorial:dismiss": [];
};

const PANEL_W = config.width * 0.82;
const PANEL_H = 460;
const CX = config.width * 0.5;
const CY = config.height * 0.5;
const BODY_FONT_SIZE = 38;
const BODY_LINE_HEIGHT = 50;
const BODY_ICON_SIZE = 44;
const BODY_ICON_PAD = 10;

export class CTutorialOverlay extends CContainer<TNone, TTutorialEvents> {
  private readonly animations = new CAnimations();

  constructor(lesson: TLesson) {
    super();

    const dim = new Graphics()
      .rect(0, 0, config.width, config.height)
      .fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static";
    dim.cursor = "pointer";
    dim.on("pointertap", () => this.emit("tutorial:dismiss"));
    this.container.addChild(dim);

    const shadow = new Graphics()
      .roundRect(
        CX - PANEL_W * 0.5,
        CY - PANEL_H * 0.5 + 14,
        PANEL_W,
        PANEL_H,
        40,
      )
      .fill({ color: COLOR_PANEL_SHADOW, alpha: 0.3 });
    this.container.addChild(shadow);

    const panel = new Graphics()
      .roundRect(CX - PANEL_W * 0.5, CY - PANEL_H * 0.5, PANEL_W, PANEL_H, 36)
      .fill({ color: COLOR_PANEL_FILL })
      .stroke({ color: COLOR_PANEL_BORDER, width: 8 });
    this.container.addChild(panel);

    const font = getAsset<FontFace>("Baloo2-Bold").family;

    const title = new Text({
      text: lesson.title,
      style: {
        fontFamily: font,
        fontWeight: "bold",
        fontSize: 56,
        fill: COLOR_FONT_FILL_BROWN,
        align: "center",
      },
    });
    title.anchor.set(0.5);
    title.position.set(CX, CY - PANEL_H * 0.5 + 90);
    this.container.addChild(title);

    if (typeof lesson.body === "string") {
      const body = new Text({
        text: lesson.body,
        style: {
          fontFamily: font,
          fontWeight: "bold",
          fontSize: BODY_FONT_SIZE,
          fill: COLOR_FONT_FILL_BROWN,
          align: "center",
          wordWrap: true,
          wordWrapWidth: PANEL_W - 100,
          lineHeight: BODY_LINE_HEIGHT,
        },
      });
      body.anchor.set(0.5);
      body.position.set(CX, CY);
      this.container.addChild(body);
    } else {
      this.buildBodyLines(lesson.body, font);
    }

    const hint = new Text({
      text: "Tap to continue",
      style: {
        fontFamily: font,
        fontWeight: "bold",
        fontSize: 28,
        fill: COLOR_PANEL_BORDER,
        align: "center",
      },
    });
    hint.anchor.set(0.5);
    hint.position.set(CX, CY + PANEL_H * 0.5 - 60);
    this.container.addChild(hint);

    const controls = tween(0, 1, {
      duration: 0.3,
      ease: "backOut",
      onUpdate: (t) => {
        if (!this.container.destroyed) this.container.alpha = t;
      },
    });
    this.animations.track(controls);
  }

  private buildBodyLines(lines: readonly TBodyLine[], font: string) {
    lines.forEach((parts, row) => {
      const y = CY + (row - (lines.length - 1) * 0.5) * BODY_LINE_HEIGHT;
      const nodes = parts.map((part) => {
        if (typeof part === "string") {
          const text = new Text({
            text: part,
            style: {
              fontFamily: font,
              fontWeight: "bold",
              fontSize: BODY_FONT_SIZE,
              fill: COLOR_FONT_FILL_BROWN,
            },
          });
          text.anchor.set(0, 0.5);
          return { node: text, width: text.width, pad: 0 };
        }
        const icon = new Sprite(getAsset<Texture>(part.icon));
        icon.anchor.set(0, 0.5);
        const source = icon.texture.orig;
        icon.scale.set(BODY_ICON_SIZE / Math.max(source.width, source.height));
        return {
          node: icon,
          width: icon.width + BODY_ICON_PAD * 2,
          pad: BODY_ICON_PAD,
        };
      });
      let x = CX - nodes.reduce((sum, part) => sum + part.width, 0) * 0.5;
      for (const { node, width, pad } of nodes) {
        node.position.set(x + pad, y);
        this.container.addChild(node);
        x += width;
      }
    });
  }

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }
}
