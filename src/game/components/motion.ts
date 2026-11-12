import { animate } from "motion";
import type { Container, Ticker } from "pixi.js";

export type TAnimation = ReturnType<typeof animate>;

export type TEase = "linear" | "easeIn" | "easeOut" | "easeInOut" | "backOut";

export type TTweenOptions = {
  duration: number;
  delay?: number;
  ease?: TEase;
  onUpdate?: (value: number) => void;
};

type TDriverUpdate = (timestamp: number) => void;

let clock = 0;
const updates = new Set<TDriverUpdate>();

export const now = (): number => clock;

export const bindAnimationsTo = (ticker: Ticker) => {
  ticker.add((t) => {
    clock += t.deltaMS;
    for (const update of [...updates]) update(clock);
  });
};

const driver = (update: TDriverUpdate) => ({
  start: () => {
    updates.add(update);
  },
  stop: () => {
    updates.delete(update);
  },
  now: () => clock,
});

export const tween = (
  from: number,
  to: number,
  options: TTweenOptions,
): TAnimation => animate(from, to, { ...options, driver });

/** Swells a target and settles it back at its resting scale. */
export const bump = (
  target: Container,
  rest: number,
  amount = 0.35,
  duration = 0.3,
): TAnimation =>
  tween(0, 1, {
    duration,
    ease: "easeOut",
    onUpdate: (t) => {
      if (target.destroyed) return;
      target.scale.set(rest * (1 + Math.sin(Math.PI * t) * amount));
    },
  });

export class CAnimations {
  private readonly running = new Set<TAnimation>();
  private readonly resolvers = new Set<() => void>();

  get activeCount(): number {
    return this.running.size;
  }

  track(controls: TAnimation, cleanup?: () => void) {
    this.running.add(controls);
    void controls.then(() => {
      if (!this.running.delete(controls)) return;
      cleanup?.();
    });
  }

  wait(controls: TAnimation, cleanup?: () => void): Promise<void> {
    return new Promise((resolve) => {
      this.running.add(controls);
      this.resolvers.add(resolve);
      void controls.then(() => {
        if (!this.resolvers.delete(resolve)) return;
        if (this.running.delete(controls)) cleanup?.();
        resolve();
      });
    });
  }

  delay(duration: number): Promise<void> {
    return this.wait(tween(0, 1, { duration }));
  }

  stopAll() {
    for (const controls of this.running) controls.stop();
    this.running.clear();
    for (const resolve of [...this.resolvers]) resolve();
    this.resolvers.clear();
  }
}
