import { Container, Sprite, Texture, type Ticker } from "pixi.js";
import { runOverTime } from "../../engine/ticker";
import { getAsset } from "../assets";
import { LAYER_VISUALS } from "./layer";
import { CCELL_WIDTH } from "./cell";
import type { CellId } from "../id";
import type { TEffect, TMoveReport } from "../model/resolve";
import type { TBlockerKind } from "../model/types";

/** Delay between one effect's burst and the next. The state is already final
 *  when a report arrives, so this is cosmetic pacing only: it makes a move
 *  that tears two covers read as two events rather than one flash. */
const EFFECT_STAGGER_MS = 80;
const BURST_DURATION_MS = 420;
const BURST_PARTICLES = 6;
const BURST_DISTANCE = CCELL_WIDTH * 0.55;
const BURST_PARTICLE_SIZE = CCELL_WIDTH * 0.3;

/**
 * Plays a move's effect log as particle bursts, in the order the model
 * resolved them.
 *
 * This is the only thing a TMoveReport drives. The board is still a pure
 * function of the state and has already drawn the final position by the time
 * anything here runs — a burst never decides what is on the board, it only
 * says what just happened there.
 */
export class CEffects {
  private readonly cancels = new Set<() => void>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private readonly container: Container,
    private readonly ticker: Ticker,
  ) {}

  play(report: TMoveReport, positionOf: (cell: CellId) => TPoint | null) {
    let index = 0;
    for (const effect of report.effects) {
      const burst = burstFor(effect);
      if (!burst) continue;

      const at = positionOf(effect.cell);
      if (!at) continue;

      // Captured per iteration so the timer fires with this effect's own
      // position and art rather than the last one in the log.
      const delay = index * EFFECT_STAGGER_MS;
      index += 1;
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        this.burst(burst, at);
      }, delay);
      this.timers.add(timer);
    }
  }

  /** Stops everything in flight and drops it from the stage. Called when the
   *  game container goes away, so a burst mid-flight cannot outlive the board
   *  it was drawn over. */
  destroy() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const cancel of this.cancels) cancel();
    this.cancels.clear();
  }

  private burst(kind: TBlockerKind, at: TPoint) {
    const texture = getAsset<Texture>(LAYER_VISUALS[kind].particle);

    for (let index = 0; index < BURST_PARTICLES; index++) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.setSize(BURST_PARTICLE_SIZE, BURST_PARTICLE_SIZE);
      // setSize works by setting scale, so the shrink below has to be relative
      // to whatever it landed on. Assigning an absolute scale instead would
      // snap every particle back to its full texture size on the first frame.
      const baseScale = sprite.scale.x;
      sprite.position.set(at.x, at.y);
      this.container.addChild(sprite);

      // Fanned evenly rather than randomly: the model is deterministic and its
      // PRNG cursor is persisted, so reaching for Math.random here would make
      // the one part of a move that is not reproducible.
      const angle = (index / BURST_PARTICLES) * Math.PI * 2;
      const spin = index % 2 === 0 ? 1 : -1;

      const cancel = runOverTime(
        this.ticker,
        BURST_DURATION_MS,
        (t) => {
          const eased = 1 - (1 - t) * (1 - t);
          sprite.position.set(
            at.x + Math.cos(angle) * BURST_DISTANCE * eased,
            at.y + Math.sin(angle) * BURST_DISTANCE * eased,
          );
          sprite.alpha = 1 - t;
          sprite.rotation = spin * t * Math.PI;
          sprite.scale.set(baseScale * (1 - t * 0.5));
        },
        () => {
          this.cancels.delete(cancel);
          sprite.destroy();
        },
      );
      this.cancels.add(cancel);
    }
  }
}

export type TPoint = { x: number; y: number };

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
