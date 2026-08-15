import type { Container } from "pixi.js";
import { CPiece } from "./piece";
import type { TPiece } from "../model/types";

export type TPiecePlacement = {
  piece: TPiece;
  x: number;
  y: number;
};

/**
 * Keyed reconciliation, shared by the board and the tray: bring `views` in
 * line with `placements`, keyed on piece id. Present in state but not on
 * screen → create; present in both → reposition and sync; on screen but gone
 * from state → destroy.
 *
 * A piece that moves between two of these layers (tray → board) is destroyed
 * in one and created in the other, so each layer stays a plain function of the
 * slice of state it draws.
 */
export const syncPieceViews = (
  views: Map<number, CPiece>,
  parent: Container,
  placements: readonly TPiecePlacement[],
  onCreate?: (view: CPiece) => void,
) => {
  const present = new Set<number>();

  for (const { piece, x, y } of placements) {
    present.add(piece.id);
    let view = views.get(piece.id);
    if (!view) {
      view = new CPiece(piece);
      views.set(piece.id, view);
      parent.addChild(view.container);
      onCreate?.(view);
    }
    view.container.position.set(x, y);
    view.sync(piece);
  }

  for (const [id, view] of views) {
    if (present.has(id)) continue;
    view.destroy();
    views.delete(id);
  }
};
