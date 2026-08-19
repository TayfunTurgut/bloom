import { CStore } from "../../engine/store";
import { placeFromTray, swapTray } from "./rules";
import type { TGameState, TMoveReport } from "./types";

export class CGameStore extends CStore<TGameState, TMoveReport> {
  place(x: number, y: number) {
    const report = placeFromTray(this._state, x, y);
    if (!report) return;
    this.notify(report);
  }

  swapTray() {
    const report = swapTray(this._state);
    if (!report) return;
    this.notify(report);
  }
}
