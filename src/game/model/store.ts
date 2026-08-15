import { CStore } from "../../engine/store";
import type { TMoveReport } from "./resolve";
import { placeFromTray } from "./rules";
import type { TGameState } from "./types";

/**
 * Owns the game state and is the only thing allowed to change it. One method
 * per player action: the controller translates input into a call here, the
 * rules do the work, and subscribed views re-render from the result.
 *
 * A change carries a TMoveReport as well as the state. The state is still the
 * whole truth of what the board *is*; the report says what *happened*, in
 * order, which is the one thing a re-render cannot recover — see resolve.ts.
 */
export class CGameStore extends CStore<TGameState, TMoveReport> {
  /** Places the front tray piece on the cell at (x, y). No-op if illegal. */
  place(x: number, y: number) {
    const report = placeFromTray(this._state, x, y);
    if (!report) return;
    this.notify(report);
  }
}
