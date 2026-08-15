import { Container, Particle, ParticleContainer, Texture } from "pixi.js";
import { animate } from "motion";
import { getAsset } from "../assets";
import { LAYER_VISUALS } from "./layer";
import { CCELL_WIDTH } from "./cell";
import type { CellId } from "../id";
import type { TEffect, TMoveReport } from "../model/resolve";
import type { TBlockerKind } from "../model/types";

/** Delay between one effect's burst and the next. The state is already final
 *  when a report arrives, so this is cosmetic pacing only: it makes a move that
 *  tears two covers read as two events rather than one flash. */
const EFFECT_STAGGER = 0.08;
const BURST_DURATION = 0.5;
const BURST_PARTICLES = 7;
const BURST_DISTANCE = CCELL_WIDTH * 0.6;
const BURST_PARTICLE_SIZE = CCELL_WIDTH * 0.42;

export type TPoint = { x: number; y: number };

/**
 * Plays a move's effect log as particle bursts, in the order the model
 * resolved them.
 *
 * This is the only thing a TMoveReport drives. The board is still a pure
 * function of the state and has already drawn the final position by the time
 * anything here runs — a burst never decides what is on the board, it only
 * says what just happened there.
 *
 * Motion drives these on its own rAF loop rather than on `app.ticker`, so the
 * `ticker.stop()` in the Capacitor pause handler does not freeze them. It does
 * not need to: a backgrounded webview stops serving rAF anyway, and a burst
 * lasts half a second.
 */
export class CEffects {
  /**
   * One emitter per cover kind, built on first use. Not an optimisation: a
   * ParticleContainer draws every particle from a single texture, and the
   * kinds' art sits on different atlas pages — so sharing one container would
   * draw every burst in whichever texture happened to be bound first.
   */
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

  /** Stops everything in flight and drops it from the stage, so a burst cannot
   *  outlive the board it was drawn over. */
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

/** One cover kind's burst: a ParticleContainer of its art, plus the animations
 *  currently flying out of it. */
class CBurstEmitter {
  readonly container: ParticleContainer;
  private readonly running = new Set<{ stop: () => void }>();
  /** Scale that fits the art into BURST_PARTICLE_SIZE. Measured against the
   *  texture's untrimmed size, because that is what a Particle builds its quad
   *  from — the packer trims and rotates frames, so the frame's own width is
   *  not the number to divide by. */
  private readonly scale: number;

  constructor(private readonly texture: Texture) {
    this.scale = BURST_PARTICLE_SIZE / Math.max(texture.width, texture.height);
    this.container = new ParticleContainer({
      // Everything a burst animates has to be declared dynamic, or the values
      // uploaded on the first frame are what stay on screen. Only uvs and
      // vertex stay static: one texture, one quad size.
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
      // Fanned evenly rather than randomly: the model is deterministic and its
      // PRNG cursor is persisted, so reaching for Math.random here would make
      // the one part of a move that is not reproducible.
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
        // Started pointing the way it will travel, so the fan reads as a
        // scatter rather than seven copies of the same sprite.
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

      // A spent particle is removed rather than parked at alpha 0: the
      // container rebuilds its buffer from particleChildren, so one left in
      // the list costs a quad on every frame afterwards.
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

/**
 * Which kind's burst an effect calls for, or null for one that shows nothing.
 * Keeping this a lookup on the effect rather than a method on the view means a
 * blocker that clears is still able to burst after its view is gone — which is
 * exactly when it needs to.
 */
const burstFor = (effect: TEffect): TBlockerKind | null => {
  switch (effect.type) {
    case "LAYER_CLEARED":
      return effect.kind === "PIECE" ? null : effect.kind;
    case "LAYER_REPLACED":
      return effect.kind === "PIECE" ? null : effect.kind;
    // A cover that only lost a hit is redrawn a stage thinner by the board,
    // which is feedback enough; a burst on every chip would drown the clear.
    case "LAYER_DAMAGED":
    case "PIECE_PLACED":
    case "PIECE_DRAINED":
    case "PIECE_REVEALED":
      return null;
  }
};
