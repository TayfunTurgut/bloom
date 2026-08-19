import { CStore } from "../../engine/store";
import type { TMoveReport } from "./resolve";
import { placeFromTray } from "./rules";
import type { TGameState } from "./types";

export class CGameStore extends CStore<TGameState, TMoveReport> {
  place(x: number, y: number) {
    const report = placeFromTray(this._state, x, y);
    if (!report) return;
    this.notify(report);
  }
}
