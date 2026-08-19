import {
  Container,
  Particle,
  ParticleContainer,
  Sprite,
  Texture,
} from "pixi.js";
import { getAsset } from "../assets";
import { CCELL_WIDTH } from "./cell";
import { CAnimations, tween } from "./motion";
import config from "../config";
import type { AssetKey } from "../../assetpack/assets";
import type { CellId } from "../id";
import type { TMoveReport } from "../model/types";

const EFFECT_STAGGER = 0.08;
const DRAIN_STAGGER = 0.05;
const DRAIN_DURATION = 0.45;
const DRAIN_SIZE = CCELL_WIDTH * 0.34;
const DRAIN_ARC = CCELL_WIDTH * 0.35;
const VANISH_DURATION = 0.45;
const VANISH_SIZE = CCELL_WIDTH * 1.15;
const RAIN_PARTICLES = 24;
const RAIN_SIZE = CCELL_WIDTH * 0.42;
const RAIN_DURATION = 1.5;

const VANISH_KEYS: readonly AssetKey[] = [
  "vanish0",
  "vanish1",
  "vanish2",
  "vanish3",
  "vanish4",
  "vanish5",
  "vanish6",
];

export type TPoint = { x: number; y: number };

export class CEffects {
  private readonly animations = new CAnimations();
  private readonly emitters = new Map<AssetKey, ParticleContainer>();

  constructor(
    private readonly boardFx: Container,
    private readonly overlayFx: Container,
  ) {}

  play(report: TMoveReport, positionOf: (cell: CellId) => TPoint | null) {
    let index = 0;
    for (const effect of report.effects) {
      if (effect.type === "FED") {
        const from = positionOf(effect.from);
        const to = positionOf(effect.to);
        if (from && to) this.feed(effect.assetKey, effect.amount, from, to);
        continue;
      }
      if (effect.type !== "HARVESTED") continue;
      const at = positionOf(effect.cell);
      if (!at) continue;
      const delay = index * EFFECT_STAGGER;
      index += 1;
      this.vanish(at, delay);
      if (effect.crop === "GROWING") this.rain(effect.assetKey, at, delay);
    }
  }

  destroy() {
    this.animations.stopAll();
    for (const emitter of this.emitters.values()) {
      emitter.destroy({ children: true });
    }
    this.emitters.clear();
  }

  private feed(assetKey: AssetKey, amount: number, from: TPoint, to: TPoint) {
    const texture = getAsset<Texture>(assetKey);
    const scale = DRAIN_SIZE / Math.max(texture.width, texture.height);
    for (let index = 0; index < amount; index++) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(scale);
      sprite.visible = false;
      this.boardFx.addChild(sprite);

      const angle = Math.random() * Math.PI * 2;
      const radius = CCELL_WIDTH * 0.2 * Math.random();
      const startX = from.x + Math.cos(angle) * radius;
      const startY = from.y + Math.sin(angle) * radius;

      const controls = tween(0, 1, {
        duration: DRAIN_DURATION,
        delay: index * DRAIN_STAGGER,
        ease: "easeIn",
        onUpdate: (t) => {
          sprite.visible = true;
          sprite.position.set(
            startX + (to.x - startX) * t,
            startY + (to.y - startY) * t - Math.sin(Math.PI * t) * DRAIN_ARC,
          );
          sprite.alpha = t < 0.8 ? 1 : 1 - (t - 0.8) * 5;
        },
      });
      this.animations.track(controls, () => sprite.destroy());
    }
  }

  private vanish(at: TPoint, delay: number) {
    const first = getAsset<Texture>(VANISH_KEYS[0]);
    const sprite = new Sprite(first);
    sprite.anchor.set(0.5);
    sprite.scale.set(VANISH_SIZE / Math.max(first.width, first.height));
    sprite.position.set(at.x, at.y);
    sprite.visible = false;
    this.boardFx.addChild(sprite);

    const controls = tween(0, VANISH_KEYS.length - 1, {
      duration: VANISH_DURATION,
      delay,
      ease: "linear",
      onUpdate: (frame) => {
        sprite.visible = true;
        sprite.texture = getAsset<Texture>(VANISH_KEYS[Math.round(frame)]);
      },
    });
    this.animations.track(controls, () => sprite.destroy());
  }

  private rain(assetKey: AssetKey, at: TPoint, delay: number) {
    const texture = getAsset<Texture>(assetKey);
    const emitter = this.emitterFor(assetKey);
    const origin = this.overlayFx.toLocal(at, this.boardFx);
    const scale = RAIN_SIZE / Math.max(texture.width, texture.height);

    for (let index = 0; index < RAIN_PARTICLES; index++) {
      const particle = new Particle({
        texture,
        x: origin.x,
        y: origin.y,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: scale,
        scaleY: scale,
        rotation: Math.random() * Math.PI * 2,
      });
      emitter.addParticle(particle);

      const drift = (Math.random() - 0.5) * config.width * 0.9;
      const rise = CCELL_WIDTH * (1 + Math.random() * 2.4);
      const endY = config.height + CCELL_WIDTH;
      const spin = (Math.random() - 0.5) * Math.PI * 3;
      const startX = particle.x;
      const startY = particle.y;
      const startRotation = particle.rotation;

      const controls = tween(0, 1, {
        duration: RAIN_DURATION * (0.75 + Math.random() * 0.5),
        delay: delay + Math.random() * 0.15,
        ease: "linear",
        onUpdate: (t) => {
          particle.x = startX + drift * t;
          particle.y =
            startY + (endY - startY) * t * t - rise * 4 * t * (1 - t);
          particle.rotation = startRotation + spin * t;
        },
      });
      this.animations.track(controls, () => emitter.removeParticle(particle));
    }
  }

  private emitterFor(assetKey: AssetKey): ParticleContainer {
    let emitter = this.emitters.get(assetKey);
    if (!emitter) {
      emitter = new ParticleContainer({
        dynamicProperties: {
          position: true,
          scale: true,
          rotation: true,
          color: true,
          uvs: false,
          vertex: false,
        },
      });
      this.overlayFx.addChild(emitter);
      this.emitters.set(assetKey, emitter);
    }
    return emitter;
  }
}
