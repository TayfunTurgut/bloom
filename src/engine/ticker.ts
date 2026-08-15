import type { Ticker } from "pixi.js";

/**
 * The whole animation system: call `onUpdate` with `t` running 0 → 1 over
 * `durationMs` on the shared ticker, then `onDone`, and hand back a cancel.
 *
 * Deliberately not a tween library — no easing catalogue, no chaining, no
 * pooling — because one cover popping is the only thing that animates today.
 * When a second thing needs animating, a real library drops in behind this
 * signature without touching a caller.
 *
 * The callback is removed before `onDone` runs, so a handler that starts
 * another run cannot leave this one attached to the ticker.
 */
export const runOverTime = (
  ticker: Ticker,
  durationMs: number,
  onUpdate: (t: number) => void,
  onDone?: () => void,
): (() => void) => {
  let elapsed = 0;
  let running = true;

  const stop = () => {
    if (!running) return;
    running = false;
    ticker.remove(tick);
  };

  const tick = () => {
    elapsed += ticker.deltaMS;
    const t = Math.min(1, elapsed / durationMs);
    onUpdate(t);
    if (t < 1) return;
    stop();
    onDone?.();
  };

  ticker.add(tick);
  return stop;
};
