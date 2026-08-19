import { Container } from "pixi.js";
import { CCell, CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import { CPiece } from "./piece";
import { syncPieceViews, type TPiecePlacement } from "./pieces";
import { CContainer, type TNone } from "../../engine/container";
import { cellIdFromXY, xyFromCellId, type CellId } from "../id";
import type { TGameState } from "../model/types";

export type TBoardEvents = {
  "board:cellClicked": [{ x: number; y: number }];
};

export class CBoard extends CContainer<TNone, TBoardEvents> {
  private readonly rows: number;
  private readonly columns: number;
  private readonly playable: ReadonlySet<CellId>;
  private readonly pieces = new Map<number, CPiece>();
  private readonly soilContainer = new Container();
  private readonly pieceContainer = new Container();
  readonly effectContainer = new Container();

  constructor(state: TGameState) {
    super();

    this.rows = state.rows;
    this.columns = state.columns;
    this.playable = new Set(state.board.keys());

    this.container.addChild(
      this.soilContainer,
      this.pieceContainer,
      this.effectContainer,
    );
    this.createCells();
  }

  render(state: TGameState) {
    const placements: TPiecePlacement[] = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        const cell = state.board.get(cellIdFromXY(x, y));
        if (!cell?.piece) continue;
        placements.push({ piece: cell.piece, ...this.positionOf(x, y) });
      }
    }

    syncPieceViews(this.pieces, this.pieceContainer, placements);
  }

  positionOfCell(cellId: CellId): { x: number; y: number } | null {
    if (!this.playable.has(cellId)) return null;
    const { x, y } = xyFromCellId(cellId);
    return this.positionOf(x, y);
  }

  applyPlacement(state: TGameState, cellId: CellId) {
    const piece = state.board.get(cellId)?.piece;
    const at = this.positionOfCell(cellId);
    if (!piece || !at) return;
    let view = this.pieces.get(piece.id);
    if (!view) {
      view = new CPiece(piece);
      this.pieces.set(piece.id, view);
    }
    this.pieceContainer.addChild(view.container);
    view.container.position.set(at.x, at.y);
    view.sync(piece);
  }

  showFedValue(pieceId: number, value: number) {
    this.pieces.get(pieceId)?.showValue(value);
  }

  removePiece(pieceId: number) {
    const view = this.pieces.get(pieceId);
    if (!view) return;
    view.destroy();
    this.pieces.delete(pieceId);
  }

  destroy() {
    for (const view of this.pieces.values()) view.destroy();
    this.pieces.clear();
    this.container.destroy({ children: true });
  }

  private createCells() {
    for (let x = 0; x < this.columns; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!this.playable.has(cellIdFromXY(x, y))) continue;

        const cell = new CCell({ x, y });
        this.soilContainer.addChild(cell.container);
        cell.container.position.copyFrom(this.positionOf(x, y));

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
