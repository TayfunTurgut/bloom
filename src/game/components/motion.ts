import { animate } from "motion";
import type { Ticker } from "pixi.js";

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

export class CAnimations {
  private readonly running = new Set<TAnimation>();

  track(controls: TAnimation, cleanup?: () => void) {
    this.running.add(controls);
    void controls.then(() => {
      if (!this.running.delete(controls)) return;
      cleanup?.();
    });
  }

  stopAll() {
    for (const controls of this.running) controls.stop();
    this.running.clear();
  }
}
