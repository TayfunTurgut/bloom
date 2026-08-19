import { Sprite, Texture } from "pixi.js";
import { CContainer, type TNone } from "../../engine/container";
import { getAsset } from "../assets";
import { CPiece, CPIECE_WIDTH } from "./piece";
import { syncPieceViews, type TPiecePlacement } from "./pieces";
import { CAnimations, tween } from "./motion";
import config from "../config";
import { TRAY_SIZE } from "../model/rules";
import type { TGameState } from "../model/types";

const SLOT_SPACING = CPIECE_WIDTH * 1.6;
const TRAY_PIECE_ALPHA = 0.8;
const SWAP_BUTTON_SIZE = 72;
const SWAP_ARC = 42;
const SWAP_DURATION = 0.35;

export type TTrayEvents = {
  "tray:swapClicked": [];
};

export class CTray extends CContainer<TNone, TTrayEvents> {
  private readonly pieces = new Map<number, CPiece>();
  private readonly animations = new CAnimations();

  constructor() {
    super();

    this.createBackground();
    this.createArrows();
    this.createSwapButton();
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

  playSwap(aId: number, bId: number) {
    const a = this.pieces.get(aId);
    const b = this.pieces.get(bId);
    if (!a || !b) return;
    this.arc(a, b.container.x, a.container.x, SWAP_ARC);
    this.arc(b, a.container.x, b.container.x, -SWAP_ARC);
  }

  destroy() {
    this.animations.stopAll();
    for (const view of this.pieces.values()) view.destroy();
    this.pieces.clear();
    this.container.destroy({ children: true });
  }

  private arc(view: CPiece, fromX: number, toX: number, lift: number) {
    const controls = tween(0, 1, {
      duration: SWAP_DURATION,
      ease: "easeInOut",
      onUpdate: (t) => {
        if (view.container.destroyed) return;
        view.container.position.set(
          fromX + (toX - fromX) * t,
          Math.sin(Math.PI * t) * lift,
        );
      },
    });
    this.animations.track(controls);
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

  private createSwapButton() {
    const button = new Sprite(getAsset<Texture>("btn-refresh"));
    button.anchor.set(0.5);
    const scale = SWAP_BUTTON_SIZE / Math.max(button.width, button.height);
    button.scale.set(scale);
    button.position.set(
      slotX(TRAY_SIZE - 1, TRAY_SIZE) + SLOT_SPACING * 0.85,
      0,
    );
    button.eventMode = "static";
    button.cursor = "pointer";
    const restore = () => {
      button.texture = getAsset<Texture>("btn-refresh");
    };
    button.on("pointerdown", () => {
      button.texture = getAsset<Texture>("btn-refresh-pressed");
    });
    button.on("pointerup", restore);
    button.on("pointerupoutside", restore);
    button.on("pointertap", () => this.emit("tray:swapClicked"));
    this.container.addChild(button);
  }
}

const slotX = (index: number, count: number) =>
  (index - (count - 1) * 0.5) * SLOT_SPACING;
