import { Graphics, Sprite, Text, Texture } from "pixi.js";
import { CContainer, type TNone } from "../../engine/container";
import { getAsset } from "../assets";
import { CAnimations, tween } from "./motion";
import { COLOR_FONT_FILL_GREEN, COLOR_FONT_STROKE_GREEN } from "../colors";
import config from "../config";
import type { AssetKey } from "../../assetpack/assets";

const BANNERS: readonly AssetKey[] = [
  "win-no-leaves",
  "win1leaf",
  "win2leaves",
  "win3leaves",
];

const DIM_FADE = 0.2;
const BANNER_POP = 0.4;
const LABEL_DELAY = 0.25;
const LABEL_FADE = 0.2;
// Long enough that a tap aimed at the board cannot skip the result.
const CONTINUE_GUARD = 0.6;

export type TLevelEndEvents = {
  "levelEnd:continue": [];
};

export class CLevelEndOverlay extends CContainer<TNone, TLevelEndEvents> {
  private readonly animations = new CAnimations();

  constructor(won: boolean, milestones: number) {
    super();

    const dim = new Graphics()
      .rect(0, 0, config.width, config.height)
      .fill({ color: 0x000000, alpha: won ? 0.5 : 0.65 });
    dim.eventMode = "static";
    dim.cursor = "pointer";
    let ready = false;
    dim.on("pointertap", () => {
      if (ready) this.emit("levelEnd:continue");
    });
    this.container.addChild(dim);

    const index = won
      ? Math.max(0, Math.min(BANNERS.length - 1, milestones))
      : 0;
    const banner = new Sprite(getAsset<Texture>(BANNERS[index]));
    banner.anchor.set(0.5);
    banner.scale.set((config.width * 0.88) / banner.width);
    banner.position.set(config.width * 0.5, config.height * 0.44);
    this.container.addChild(banner);

    const label = new Text({
      text: won ? "Level complete!" : "No space left!",
      style: {
        fontFamily: getAsset<FontFace>("Baloo2-Bold").family,
        fontWeight: "bold",
        fontSize: 54,
        fill: COLOR_FONT_FILL_GREEN,
        stroke: { color: COLOR_FONT_STROKE_GREEN, width: 8 },
        align: "center",
      },
    });
    label.anchor.set(0.5);
    label.position.set(
      config.width * 0.5,
      banner.y + (banner.height * 0.5 + 70),
    );
    this.container.addChild(label);

    const prompt = new Text({
      text: "Tap to continue",
      style: {
        fontFamily: getAsset<FontFace>("Baloo2-Regular").family,
        fontSize: 32,
        fill: COLOR_FONT_FILL_GREEN,
        align: "center",
      },
    });
    prompt.anchor.set(0.5);
    prompt.position.set(config.width * 0.5, label.y + 64);
    this.container.addChild(prompt);

    const fadeIn = (
      target: Graphics | Text,
      delay: number,
      duration: number,
    ) => {
      target.alpha = 0;
      this.animations.track(
        tween(0, 1, {
          duration,
          delay,
          ease: "easeOut",
          onUpdate: (t) => {
            if (!target.destroyed) target.alpha = t;
          },
        }),
      );
    };
    fadeIn(dim, 0, DIM_FADE);
    fadeIn(label, LABEL_DELAY, LABEL_FADE);
    fadeIn(prompt, CONTINUE_GUARD, LABEL_FADE);

    this.animations.track(
      tween(0, 1, {
        duration: BANNER_POP,
        ease: "backOut",
        onUpdate: (t) => {
          if (banner.destroyed) return;
          banner.scale.set(((config.width * 0.88) / banner.texture.width) * t);
        },
      }),
    );
    this.animations.track(tween(0, 1, { duration: CONTINUE_GUARD }), () => {
      ready = true;
    });
  }

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }
}
