import { Graphics } from "pixi.js";
import { COLOR_GOAL_PROGRESS_FILL } from "../colors";
import { now } from "./motion";

const PERIOD_MS = 1200;
const FILL_ALPHA = 0.15;
const STROKE_WIDTH = 8;

/**
 * A ring that breathes over whatever it marks, for as long as it is visible.
 * The pulse is untracked by CAnimations on purpose: an endless animation must
 * not stall the idle() check that waits for activeCount to reach zero.
 */
export const createPulseRing = (radius: number): Graphics => {
  const ring = new Graphics();
  drawPulseRing(ring, radius);
  ring.visible = false;
  ring.onRender = () => {
    if (!ring.visible) return;
    const t = (now() % PERIOD_MS) / PERIOD_MS;
    const wave = Math.sin(t * Math.PI * 2);
    ring.alpha = 0.75 + 0.25 * wave;
    ring.scale.set(1 + 0.05 * wave);
  };
  return ring;
};

/** Resizes a ring in place, for a marker that moves between targets. */
export const drawPulseRing = (ring: Graphics, radius: number) => {
  ring
    .clear()
    .circle(0, 0, radius)
    .fill({ color: COLOR_GOAL_PROGRESS_FILL, alpha: FILL_ALPHA })
    .circle(0, 0, radius)
    .stroke({ width: STROKE_WIDTH, color: COLOR_GOAL_PROGRESS_FILL });
};
