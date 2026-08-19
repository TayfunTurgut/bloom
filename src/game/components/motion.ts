import type { animate } from "motion";

export type TAnimation = ReturnType<typeof animate>;

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
