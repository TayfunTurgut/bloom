import { Rectangle, Sprite, Texture } from "pixi.js";
import { cellIdFromXY } from "../id";
import { getAsset } from "../assets";
import { CContainer } from "../../engine/container";

export const CCELL_WIDTH = 100;
export const CCELL_HEIGHT = 100;

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
    sprite.setSize(CCELL_WIDTH, CCELL_HEIGHT);
    this.container.addChild(sprite);

    this.setupInteractivity();
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
