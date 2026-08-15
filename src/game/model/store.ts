import { CStore } from "../../engine/store";
import { placeFromTray } from "./rules";
import type { TGameState } from "./types";

/**
 * Owns the game state and is the only thing allowed to change it. One method
 * per player action: the controller translates input into a call here, the
 * rules do the work, and subscribed views re-render from the result.
 */
export class CGameStore extends CStore<TGameState> {
  /** Places the front tray piece on the cell at (x, y). No-op if illegal. */
  place(x: number, y: number) {
    if (!placeFromTray(this._state, x, y)) return;
    this.notify();
  }
}
