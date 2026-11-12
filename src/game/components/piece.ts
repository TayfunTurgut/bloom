import { Sprite, Text, Texture } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { CCELL_GAP, CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import { CAnimations, now, tween } from "./motion";
import { COLOR_PIECE_VALUE_FILL, COLOR_PIECE_VALUE_STROKE } from "../colors";
import type { AssetKey } from "../../assetpack/assets";
import type { TCropState, TPiece } from "../model/types";

export const CPIECE_WIDTH = 80;
export const CPIECE_HEIGHT = 80;
const CROP_BASELINE_Y = CPIECE_HEIGHT * 0.5;

const SUPPLY_TINT = 0x777777;

const GOAL_PULSE_PERIOD_MS = 1200;
const GOAL_PULSE_AMPLITUDE = 0.025;

const LAND_FROM = 0.6;
const LAND_DURATION = 0.18;
const REFUSE_SWAY = 6;
const REFUSE_DURATION = 0.2;

// Small boards draw a piece at more than twice its design size, so the value
// is rasterised above screen density to stay sharp when scaled up.
const VALUE_RESOLUTION = Math.min(6, (window.devicePixelRatio || 1) * 2);

export class CPiece extends CContainer<{
  sprite: Sprite;
  growth: Sprite;
  rock: Sprite;
  value: Text;
}> {
  readonly id: number;
  private drawnValue: number;
  private drawnType: TCropState;
  private goalPulse = false;
  private readonly cropScale: number;
  private readonly animations = new CAnimations();

  constructor(piece: TPiece) {
    super();

    this.id = piece.id;
    this.drawnValue = piece.currentValue;
    this.drawnType = piece.type;

    const sprite = new Sprite(getAsset<Texture>(piece.assetKey));
    sprite.anchor.set(0.5, 1);
    const source = sprite.texture.orig;
    const scale = Math.min(
      CPIECE_WIDTH / source.width,
      CPIECE_HEIGHT / source.height,
    );
    sprite.scale.set(scale);
    sprite.position.set(0, CROP_BASELINE_Y);
    this.addNamedChild("sprite", sprite);
    this.cropScale = scale;

    const growth = new Sprite(
      getAsset<Texture>(growthTextureFor(piece.currentValue)),
    );
    growth.anchor.set(0.5);
    this.addNamedChild("growth", growth);

    const rock = new Sprite(getAsset<Texture>(rockTextureFor(piece.id)));
    rock.anchor.set(0.5);
    const rockSource = rock.texture.orig;
    rock.scale.set(
      Math.min(
        (CPIECE_WIDTH * 0.8) / rockSource.width,
        (CPIECE_HEIGHT * 0.8) / rockSource.height,
      ),
    );
    rock.position.set(CPIECE_WIDTH * 0.12, CPIECE_HEIGHT * 0.18);
    this.addNamedChild("rock", rock);

    const text = new Text({
      text: piece.currentValue,
      style: {
        fill: COLOR_PIECE_VALUE_FILL,
        stroke: { color: COLOR_PIECE_VALUE_STROKE, width: 6 },
        fontSize: 34,
        fontFamily: getAsset<FontFace>("Baloo2-Bold").family,
        fontWeight: "bold",
      },
      resolution: VALUE_RESOLUTION,
    });
    text.anchor.set(0.5);
    text.position.set(-CPIECE_WIDTH * 0.5 + 8, -CPIECE_HEIGHT * 0.5 + 8);
    this.addNamedChild("value", text);

    this.apply(piece);

    // Untracked by CAnimations on purpose: an endless pulse must not stall
    // the idle() check that waits for activeCount to reach zero.
    this.container.onRender = () => {
      if (!this.goalPulse) return;
      const t = (now() % GOAL_PULSE_PERIOD_MS) / GOAL_PULSE_PERIOD_MS;
      this.container.scale.set(
        1 + Math.sin(t * Math.PI * 2) * GOAL_PULSE_AMPLITUDE,
      );
    };
  }

  get activeCount(): number {
    return this.animations.activeCount;
  }

  setGoalHighlight(active: boolean) {
    if (active === this.goalPulse) return;
    this.goalPulse = active;
    if (!active) this.container.scale.set(1);
  }

  showValue(value: number) {
    if (value === this.drawnValue) return;
    this.drawnValue = value;
    const growth = this.getChildByLabel("growth");
    growth.visible = this.drawnType === "GROWING" && value > 0;
    if (growth.visible) {
      growth.texture = getAsset<Texture>(growthTextureFor(value));
      growth.setSize(CCELL_WIDTH - CCELL_GAP, CCELL_HEIGHT - CCELL_GAP);
    }
    this.getChildByLabel("value").text = value;
    this.popValue();
  }

  sync(piece: TPiece) {
    const sprouted = piece.type === "GROWING" && this.drawnType !== "GROWING";
    const valueChanged = piece.currentValue !== this.drawnValue;
    this.drawnType = piece.type;
    this.drawnValue = piece.currentValue;
    this.apply(piece);
    if (sprouted || (valueChanged && piece.type === "GROWING")) {
      this.popValue();
    }
  }

  // Both moves animate the crop sprite, not the container: its anchor sits on
  // the soil, and the container's scale belongs to the goal pulse and the tray.

  /** The crop grows out of the soil as it is placed. */
  playLand() {
    const sprite = this.getChildByLabel("sprite");
    const controls = tween(LAND_FROM, 1, {
      duration: LAND_DURATION,
      ease: "backOut",
      onUpdate: (value) => {
        if (!sprite.destroyed) sprite.scale.set(this.cropScale * value);
      },
    });
    this.animations.track(controls);
  }

  /** The crop shakes its head: this cell is taken. */
  playRefuse() {
    const sprite = this.getChildByLabel("sprite");
    const controls = tween(0, 1, {
      duration: REFUSE_DURATION,
      ease: "linear",
      onUpdate: (t) => {
        if (sprite.destroyed) return;
        sprite.x = Math.sin(t * Math.PI * 4) * REFUSE_SWAY * (1 - t);
      },
    });
    this.animations.track(controls);
  }

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }

  private apply(piece: TPiece) {
    const sprite = this.getChildByLabel("sprite");
    const growth = this.getChildByLabel("growth");
    const rock = this.getChildByLabel("rock");
    const text = this.getChildByLabel("value");

    sprite.tint = piece.type === "SUPPLY" ? SUPPLY_TINT : 0xffffff;
    growth.visible = piece.type === "GROWING" && piece.currentValue > 0;
    if (growth.visible) {
      growth.texture = getAsset<Texture>(growthTextureFor(piece.currentValue));
      growth.setSize(CCELL_WIDTH - CCELL_GAP, CCELL_HEIGHT - CCELL_GAP);
    }
    rock.visible = piece.rocked === true;
    text.visible = piece.type !== "SUPPLY";
    text.text = piece.currentValue;
  }

  private popValue() {
    const text = this.getChildByLabel("value");
    const controls = tween(0, 1, {
      duration: 0.35,
      ease: "easeOut",
      onUpdate: (t) => {
        text.scale.set(1 + Math.sin(Math.PI * t) * 0.5);
      },
    });
    this.animations.track(controls);
  }
}

const growthTextureFor = (value: number): AssetKey => {
  if (value >= 10) return "block0";
  if (value >= 7) return "block1";
  if (value >= 4) return "block2";
  return "block3";
};

const ROCK_TEXTURES: readonly AssetKey[] = ["rock1", "rock2", "rock3"];

const rockTextureFor = (id: number): AssetKey =>
  ROCK_TEXTURES[id % ROCK_TEXTURES.length];
