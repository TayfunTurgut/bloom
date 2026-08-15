import type { Container } from "pixi.js";
import { CPiece } from "./piece";
import { syncViews } from "./sync";
import type { TPiece } from "../model/types";

export type TPiecePlacement = {
  piece: TPiece;
  x: number;
  y: number;
};

/**
 * Keyed reconciliation for flowers, keyed on piece id. A thin adapter over
 * `syncViews` so the board and the tray keep the call they always made while
 * the diffing itself is shared with the board's layer views.
 */
export const syncPieceViews = (
  views: Map<number, CPiece>,
  parent: Container,
  placements: readonly TPiecePlacement[],
  onCreate?: (view: CPiece) => void,
) => {
  syncViews(
    views,
    parent,
    placements.map(({ piece, x, y }) => ({
      key: piece.id,
      datum: piece,
      x,
      y,
    })),
    (piece) => new CPiece(piece),
    onCreate,
  );
};
