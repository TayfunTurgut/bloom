import { Sprite, Texture } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { CPiece, CPIECE_WIDTH } from "./piece";
import { syncPieceViews, type TPiecePlacement } from "./pieces";
import config from "../config";
import { TRAY_SIZE } from "../model/rules";
import type { TGameState } from "../model/types";

const SLOT_SPACING = CPIECE_WIDTH * 1.6;
const TRAY_PIECE_ALPHA = 0.8;

export class CTray extends CContainer {
  private readonly pieces = new Map<number, CPiece>();

  constructor() {
    super();

    this.createBackground();
    this.createArrows();
  }

  render(state: TGameState) {
    const placements: TPiecePlacement[] = state.tray.map((piece, index) => ({
      piece,
      x: slotX(index, state.tray.length),
      y: 0,
    }));
    syncPieceViews(this.pieces, this.container, placements, (view) => {
      view.container.alpha = TRAY_PIECE_ALPHA;
    });
  }

  private createBackground() {
    const sprite = new Sprite(getAsset<Texture>("bottom-bar"));
    sprite.anchor.set(0.5);
    sprite.scale.set(config.width / sprite.width);
    this.container.addChild(sprite);
  }

  private createArrows() {
    for (let index = 0; index < TRAY_SIZE - 1; index++) {
      const arrow = new Sprite(getAsset<Texture>("drop-down-arrow"));
      arrow.anchor.set(0.5);
      const scale = (CPIECE_WIDTH * 0.5) / Math.max(arrow.width, arrow.height);
      arrow.scale.set(scale);
      arrow.rotation = -Math.PI / 2;
      arrow.tint = 0x5c3a22;
      arrow.position.set(
        (slotX(index, TRAY_SIZE) + slotX(index + 1, TRAY_SIZE)) * 0.5,
        0,
      );
      this.container.addChild(arrow);
    }
  }
}

const slotX = (index: number, count: number) =>
  (index - (count - 1) * 0.5) * SLOT_SPACING;
