import type { Container } from "pixi.js";
import { CPiece } from "./piece";
import { syncViews } from "./sync";
import type { TPiece } from "../model/types";

export type TPiecePlacement = {
  piece: TPiece;
  x: number;
  y: number;
};

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
