import { Graphics, Sprite, Texture } from "pixi.js";
import { CContainer, type TNone } from "../../engine/container";
import { getAsset } from "../assets";
import { CPiece, CPIECE_WIDTH } from "./piece";
import { syncPieceViews, type TPiecePlacement } from "./pieces";
import { CAnimations, tween } from "./motion";
import { createPulseRing } from "./pulse";
import { COLOR_TRAY_ARROW } from "../colors";
import config from "../config";
import { TRAY_SIZE } from "../model/rules";
import type { TGameState } from "../model/types";

const TRAY_PIECE_SCALE = 1.2;
const NEXT_PIECE_SCALE = 1.35;
const SLOT_SPACING = CPIECE_WIDTH * TRAY_PIECE_SCALE + 28;
const SLOT0_X = -204;
const DIVIDER_X = 130;
const DIVIDER_HEIGHT = 96;
const QUEUED_PIECE_ALPHA = 0.8;
const SETTINGS_BUTTON_X = 245;
const SETTINGS_BUTTON_SIZE = 72;
const SLIDE_DROP = 84;
const SLIDE_DURATION = 0.15;
const HIGHLIGHT_RADIUS = (CPIECE_WIDTH * NEXT_PIECE_SCALE) / 2 + 8;

export type TTrayEvents = {
  "tray:settingsClicked": [];
};

export class CTray extends CContainer<TNone, TTrayEvents> {
  private readonly pieces = new Map<number, CPiece>();
  private readonly animations = new CAnimations();
  private readonly nextHighlight: Graphics;

  constructor() {
    super();

    this.createBackground();
    this.nextHighlight = this.createNextHighlight();
    this.createArrows();
    this.createDivider(DIVIDER_X, DIVIDER_HEIGHT);
    this.createSettingsButton();
  }

  render(state: TGameState) {
    // Every running slide aims at a slot that may just have shifted,
    // so drop them all and let syncPieceViews snap to the true slots.
    this.animations.stopAll();
    const before = new Map<number, { x: number; scale: number }>();
    for (const [id, view] of this.pieces) {
      before.set(id, { x: view.container.x, scale: view.container.scale.x });
    }
    const placements: TPiecePlacement[] = state.tray.map((piece, index) => ({
      piece,
      x: slotX(index),
      y: 0,
    }));
    const created: CPiece[] = [];
    syncPieceViews(this.pieces, this.container, placements, (view) => {
      created.push(view);
    });
    // The piece at the last index is placed next, so re-evaluate scale by index
    // every render: a piece is created at index 0 and shifts to the end over time.
    const nextIndex = state.tray.length - 1;
    state.tray.forEach((piece, index) => {
      const view = this.pieces.get(piece.id);
      if (!view) return;
      const isNext = index === nextIndex;
      view.container.alpha = isNext ? 1 : QUEUED_PIECE_ALPHA;
      view.container.scale.set(isNext ? NEXT_PIECE_SCALE : TRAY_PIECE_SCALE);
      const from = before.get(piece.id);
      if (from) this.advance(view, from.x, from.scale);
    });
    for (const view of created) this.slideIn(view);

    this.nextHighlight.visible = state.tray.length > 0;
    this.nextHighlight.position.set(slotX(state.tray.length - 1), 0);
  }

  /** Moves a piece that was already in the tray along to its new slot. */
  private advance(view: CPiece, fromX: number, fromScale: number) {
    const toX = view.container.x;
    const toScale = view.container.scale.x;
    if (fromX === toX && fromScale === toScale) return;
    view.container.x = fromX;
    view.container.scale.set(fromScale);
    const controls = tween(0, 1, {
      duration: SLIDE_DURATION,
      ease: "easeOut",
      onUpdate: (t) => {
        if (view.container.destroyed) return;
        view.container.x = fromX + (toX - fromX) * t;
        view.container.scale.set(fromScale + (toScale - fromScale) * t);
      },
    });
    this.animations.track(controls);
  }

  private slideIn(view: CPiece) {
    const targetX = view.container.x;
    const targetY = view.container.y;
    const targetAlpha = view.container.alpha;
    view.container.alpha = 0;
    const controls = tween(0, 1, {
      duration: SLIDE_DURATION,
      ease: "backOut",
      onUpdate: (t) => {
        if (view.container.destroyed) return;
        view.container.position.set(targetX, targetY - SLIDE_DROP * (1 - t));
        view.container.alpha = targetAlpha * t;
      },
    });
    this.animations.track(controls);
  }

  activeCount(): number {
    let total = this.animations.activeCount;
    for (const view of this.pieces.values()) total += view.activeCount;
    return total;
  }

  destroy() {
    this.animations.stopAll();
    for (const view of this.pieces.values()) view.destroy();
    this.pieces.clear();
    this.container.destroy({ children: true });
  }

  private createBackground() {
    const sprite = new Sprite(getAsset<Texture>("bottom-bar"));
    sprite.anchor.set(0.5);
    sprite.scale.set(config.width / sprite.width);
    this.container.addChild(sprite);
  }

  /** Marks the piece that will be placed next. */
  private createNextHighlight(): Graphics {
    const ring = createPulseRing(HIGHLIGHT_RADIUS);
    this.container.addChild(ring);
    return ring;
  }

  private createArrows() {
    for (let index = 0; index < TRAY_SIZE - 1; index++) {
      const arrow = new Sprite(getAsset<Texture>("drop-down-arrow"));
      arrow.anchor.set(0.5);
      const scale = (CPIECE_WIDTH * 0.5) / Math.max(arrow.width, arrow.height);
      arrow.scale.set(scale);
      arrow.rotation = -Math.PI / 2;
      arrow.tint = COLOR_TRAY_ARROW;
      arrow.position.set((slotX(index) + slotX(index + 1)) * 0.5, 0);
      this.container.addChild(arrow);
    }
  }

  private createDivider(x: number, height: number) {
    const divider = new Sprite(getAsset<Texture>("window-bar-vertical"));
    divider.anchor.set(0.5);
    divider.scale.set(height / divider.height);
    divider.position.set(x, 0);
    this.container.addChild(divider);
  }

  private createSettingsButton() {
    const button = new Sprite(getAsset<Texture>("btn-settings"));
    button.anchor.set(0.5);
    const scale = SETTINGS_BUTTON_SIZE / Math.max(button.width, button.height);
    button.scale.set(scale);
    button.position.set(SETTINGS_BUTTON_X, 0);
    button.eventMode = "static";
    button.cursor = "pointer";
    const restore = () => {
      button.texture = getAsset<Texture>("btn-settings");
    };
    button.on("pointerdown", () => {
      button.texture = getAsset<Texture>("btn-settings-pressed");
    });
    button.on("pointerup", restore);
    button.on("pointerupoutside", restore);
    button.on("pointertap", () => this.emit("tray:settingsClicked"));
    this.container.addChild(button);
  }
}

const slotX = (index: number) => SLOT0_X + index * SLOT_SPACING;
