import { CCell, CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import { CPiece } from "./piece";
import { syncPieceViews, type TPiecePlacement } from "./pieces";
import { CContainer, type TNone } from "../../engine/container";
import { cellIdFromXY, type CellId } from "../id";
import type { TGameState } from "../model/types";

export type TBoardEvents = {
  "board:cellClicked": [{ x: number; y: number }];
};

/**
 * The view of the board half of the state. It holds no idea of what is placed
 * where — `render` reads that from the state every time.
 */
export class CBoard extends CContainer<TNone, TBoardEvents> {
  private readonly rows: number;
  private readonly columns: number;
  private readonly playable: ReadonlySet<CellId>;
  private readonly pieces = new Map<number, CPiece>();

  constructor(state: TGameState) {
    super();

    this.rows = state.rows;
    this.columns = state.columns;
    // Fixed once, at construction: placement only ever writes to a cell that
    // already passed canPlace, so the board's key set never changes in play.
    this.playable = new Set(state.board.keys());
    this.createCells();
  }

  render(state: TGameState) {
    const placements: TPiecePlacement[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        const piece = state.board.get(cellIdFromXY(x, y));
        if (!piece) continue;
        placements.push({ piece, ...this.positionOf(x, y) });
      }
    }
    syncPieceViews(this.pieces, this.container, placements);
  }

  private createCells() {
    for (let x = 0; x < this.columns; x++) {
      for (let y = 0; y < this.rows; y++) {
        // A hole keeps its slot in the grid but grows no soil and takes no tap.
        if (!this.playable.has(cellIdFromXY(x, y))) continue;

        const cell = new CCell({ x, y });
        this.container.addChild(cell.container);
        cell.container.position.copyFrom(this.positionOf(x, y));

        // "pointertap" fires for mouse and touch; "click" is mouse-only.
        cell.on("pointertap", () => this.onCellClicked(cell), this);
      }
    }
  }

  private positionOf(x: number, y: number) {
    const totalWidth = CCELL_WIDTH * this.columns;
    const totalHeight = CCELL_HEIGHT * this.rows;
    return {
      x: -totalWidth * 0.5 + CCELL_WIDTH * 0.5 + CCELL_WIDTH * x,
      y: -totalHeight * 0.5 + CCELL_HEIGHT * 0.5 + CCELL_HEIGHT * y,
    };
  }

  private onCellClicked(cell: CCell) {
    this.emit("board:cellClicked", { x: cell.data.x, y: cell.data.y });
  }
}
