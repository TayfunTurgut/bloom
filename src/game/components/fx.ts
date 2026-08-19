import { Container, Particle, ParticleContainer, Texture } from "pixi.js";
import { animate } from "motion";
import { getAsset } from "../assets";
import { LAYER_VISUALS } from "./layer";
import { CCELL_WIDTH } from "./cell";
import type { CellId } from "../id";
import type { TEffect, TMoveReport } from "../model/resolve";
import type { TBlockerKind } from "../model/types";

const EFFECT_STAGGER = 0.08;
const BURST_DURATION = 0.5;
const BURST_PARTICLES = 7;
const BURST_DISTANCE = CCELL_WIDTH * 0.6;
const BURST_PARTICLE_SIZE = CCELL_WIDTH * 0.42;

export type TPoint = { x: number; y: number };

export class CEffects {
  private readonly emitters = new Map<TBlockerKind, CBurstEmitter>();

  constructor(private readonly container: Container) {}

  play(report: TMoveReport, positionOf: (cell: CellId) => TPoint | null) {
    let index = 0;
    for (const effect of report.effects) {
      const kind = burstFor(effect);
      if (!kind) continue;

      const at = positionOf(effect.cell);
      if (!at) continue;

      this.emitterFor(kind).burst(at, index * EFFECT_STAGGER);
      index += 1;
    }
  }

  destroy() {
    for (const emitter of this.emitters.values()) emitter.destroy();
    this.emitters.clear();
  }

  private emitterFor(kind: TBlockerKind): CBurstEmitter {
    let emitter = this.emitters.get(kind);
    if (!emitter) {
      emitter = new CBurstEmitter(
        getAsset<Texture>(LAYER_VISUALS[kind].particle),
      );
      this.container.addChild(emitter.container);
      this.emitters.set(kind, emitter);
    }
    return emitter;
  }
}

class CBurstEmitter {
  readonly container: ParticleContainer;
  private readonly running = new Set<{ stop: () => void }>();
  private readonly scale: number;

  constructor(private readonly texture: Texture) {
    this.scale = BURST_PARTICLE_SIZE / Math.max(texture.width, texture.height);
    this.container = new ParticleContainer({
      dynamicProperties: {
        position: true,
        scale: true,
        rotation: true,
        color: true,
        uvs: false,
        vertex: false,
      },
    });
  }

  burst(at: TPoint, delay: number) {
    for (let index = 0; index < BURST_PARTICLES; index++) {
      const angle = (index / BURST_PARTICLES) * Math.PI * 2;
      const spin = index % 2 === 0 ? 1 : -1;

      const particle = new Particle({
        texture: this.texture,
        x: at.x,
        y: at.y,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: this.scale,
        scaleY: this.scale,
        rotation: angle,
      });
      this.container.addParticle(particle);

      const controls = animate(
        particle,
        {
          x: at.x + Math.cos(angle) * BURST_DISTANCE,
          y: at.y + Math.sin(angle) * BURST_DISTANCE,
          rotation: angle + spin * Math.PI * 0.75,
          scaleX: this.scale * 0.4,
          scaleY: this.scale * 0.4,
          alpha: 0,
        },
        { duration: BURST_DURATION, delay, ease: "easeOut" },
      );
      this.running.add(controls);

      void controls.then(() => {
        this.running.delete(controls);
        this.container.removeParticle(particle);
      });
    }
  }

  destroy() {
    for (const controls of this.running) controls.stop();
    this.running.clear();
    this.container.destroy({ children: true });
  }
}

const burstFor = (effect: TEffect): TBlockerKind | null => {
  switch (effect.type) {
    case "LAYER_CLEARED":
      return effect.kind === "PIECE" ? null : effect.kind;
    case "LAYER_REPLACED":
      return effect.kind === "PIECE" ? null : effect.kind;
    case "LAYER_DAMAGED":
    case "PIECE_PLACED":
    case "PIECE_DRAINED":
    case "PIECE_REVEALED":
      return null;
  }
};
