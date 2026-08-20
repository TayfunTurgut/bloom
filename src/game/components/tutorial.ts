import { Graphics, Text } from "pixi.js";
import { CContainer, type TNone } from "../../engine/container";
import { getAsset } from "../assets";
import { CAnimations, tween } from "./motion";
import { COLOR_FONT_FILL_BROWN } from "../colors";
import config from "../config";

export type TTutorialEvents = {
  "tutorial:dismiss": [];
};

type TLesson = { title: string; body: string };

const LESSONS: readonly TLesson[] = [
  {
    title: "Welcome!",
    body: "Tap an empty tile to plant a crop. A crop with no neighbours starts growing.",
  },
  {
    title: "Feed & harvest",
    body: "Plant next to a growing crop to feed it. Feed it down to zero to harvest it!",
  },
  {
    title: "Reach the goals",
    body: "Harvest the crops shown up top before the board fills. Take your time and enjoy.",
  },
];

const PANEL_W = config.width * 0.82;
const PANEL_H = 460;
const CX = config.width * 0.5;
const CY = config.height * 0.5;

const PANEL_FILL = 0xf5e7cf;
const PANEL_BORDER = 0x8a5a3b;

export const lessonForLevel = (levelIndex: number): TLesson | null =>
  LESSONS[levelIndex] ?? null;

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

    const panel = new Graphics()
      .roundRect(CX - PANEL_W * 0.5, CY - PANEL_H * 0.5, PANEL_W, PANEL_H, 36)
      .fill({ color: PANEL_FILL })
      .stroke({ color: PANEL_BORDER, width: 8 });
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

    const body = new Text({
      text: lesson.body,
      style: {
        fontFamily: font,
        fontWeight: "bold",
        fontSize: 38,
        fill: COLOR_FONT_FILL_BROWN,
        align: "center",
        wordWrap: true,
        wordWrapWidth: PANEL_W - 100,
        lineHeight: 50,
      },
    });
    body.anchor.set(0.5);
    body.position.set(CX, CY);
    this.container.addChild(body);

    const hint = new Text({
      text: "tap to continue",
      style: {
        fontFamily: font,
        fontWeight: "bold",
        fontSize: 28,
        fill: PANEL_BORDER,
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

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }
}
