import { Rectangle, Sprite, Texture } from "pixi.js";
import { cellIdFromXY } from "../id";
import { getAsset } from "../assets";
import { CContainer } from "../../engine/container";
import { tween } from "./motion";

export const CCELL_WIDTH = 100;
export const CCELL_HEIGHT = 100;
export const CCELL_GAP = 8;

const PRESS_SCALE = 0.94;
const RELEASE_DURATION = 0.1;

type ICellOptions = {
  x: number;
  y: number;
};

type ICellData = {
  x: number;
  y: number;
};

export class CCell extends CContainer {
  data: ICellData;

  constructor(options: ICellOptions) {
    super();

    this.data = {
      x: options.x,
      y: options.y,
    };

    const sprite = new Sprite(getAsset<Texture>("game-grid-bg"));
    sprite.anchor.set(0.5);
    sprite.setSize(CCELL_WIDTH - CCELL_GAP, CCELL_HEIGHT - CCELL_GAP);
    this.container.addChild(sprite);

    this.setupInteractivity();
    this.setupPressFeedback(sprite);
  }

  // The soil dips under the finger and springs back on release, so a tap is
  // felt before the move it causes is drawn.
  private setupPressFeedback(sprite: Sprite) {
    const rest = sprite.scale.x;
    const release = () => {
      const from = sprite.scale.x / rest;
      if (from === 1) return;
      tween(from, 1, {
        duration: RELEASE_DURATION,
        ease: "easeOut",
        onUpdate: (value) => {
          if (!sprite.destroyed) sprite.scale.set(rest * value);
        },
      });
    };
    this.container.on("pointerdown", () =>
      sprite.scale.set(rest * PRESS_SCALE),
    );
    this.container.on("pointerup", release);
    this.container.on("pointerupoutside", release);
  }

  private setupInteractivity() {
    this.container.eventMode = "static";
    this.container.hitArea = new Rectangle(
      -CCELL_WIDTH * 0.5,
      -CCELL_HEIGHT * 0.5,
      CCELL_WIDTH,
      CCELL_HEIGHT,
    );
  }

  get id() {
    return cellIdFromXY(this.data.x, this.data.y);
  }
}
