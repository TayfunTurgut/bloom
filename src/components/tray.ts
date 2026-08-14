import { Sprite, Texture } from "pixi.js";
import { CContainer } from "./common/container";
import { getAsset } from "../utils/assets";
import { CPiece, CPIECE_WIDTH } from "./piece";
import config from "../config";
import type { AssetKey } from "../assetpack/assets";

// Horizontal distance between adjacent piece slots. Must exceed CPIECE_WIDTH
// so an arrow fits in the gap between two pieces.
const SLOT_SPACING = CPIECE_WIDTH * 1.6;
// Centered slot x-positions: index 0 = leftmost (newest), 2 = rightmost (front).
const SLOT_X = [-SLOT_SPACING, 0, SLOT_SPACING];
// Pieces are dimmed while waiting in the tray; full opacity once placed.
const TRAY_PIECE_ALPHA = 0.8;

type TTrayOptions = {
  pieces: AssetKey[];
};

export class CTray extends CContainer {
  private flowers: CPiece[] = [];

  constructor(private readonly options: TTrayOptions) {
    super();

    this.createBackground();
    this.createArrows();
    this.refill();
  }

  refill() {
    const willRefill = this.flowers.length < 3;
    if (!willRefill) return;

    while (this.flowers.length < 3) {
      const pieces = this.options.pieces;
      const key = pieces[Math.floor(Math.random() * pieces.length)];
      const flower = new CPiece(key, Math.ceil(Math.random() * 12));
      flower.container.alpha = TRAY_PIECE_ALPHA;
      this.container.addChild(flower.container);
      this.flowers.unshift(flower);
    }

    this.flowers.forEach((flower, index) => {
      flower.container.position.set(SLOT_X[index], 0);
    });
  }

  pop() {
    const flower = this.flowers.pop();
    if (!flower) {
      throw new Error("Could not remove a flower from the tray");
    }
    flower.container.scale.set(1);
    flower.container.alpha = 1;
    return flower;
  }

  private createBackground() {
    const sprite = new Sprite(getAsset<Texture>("bars/bar_wood_3"));
    sprite.anchor.set(0.5);
    sprite.scale.set(config.width / sprite.width);
    this.container.addChild(sprite);
  }

  private createArrows() {
    // Arrows sit in the gaps between the three slots, pointing right so the
    // pieces read as flowing left -> right.
    const gapX = [(SLOT_X[0] + SLOT_X[1]) * 0.5, (SLOT_X[1] + SLOT_X[2]) * 0.5];
    for (const x of gapX) {
      const arrow = new Sprite(getAsset<Texture>("decor/wood_arrow_down"));
      arrow.anchor.set(0.5);
      const scale = (CPIECE_WIDTH * 0.5) / Math.max(arrow.width, arrow.height);
      arrow.scale.set(scale);
      arrow.rotation = -Math.PI / 2; // point right
      arrow.tint = 0x5c3a22; // darken so it reads against the wood bar
      arrow.position.set(x, 0);
      this.container.addChild(arrow);
    }
  }
}
