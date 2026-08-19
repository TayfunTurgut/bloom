import { Container } from "pixi.js";
import { CCell, CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import { CLayer } from "./layer";
import { CPiece } from "./piece";
import { syncPieceViews, type TPiecePlacement } from "./pieces";
import { syncViews, type TViewEntry } from "./sync";
import { CContainer, type TNone } from "../../engine/container";
import { cellIdFromXY, xyFromCellId, type CellId } from "../id";
import { blocksAdjacency } from "../model/layers";
import type { TBlockerLayer, TGameState } from "../model/types";

export type TBoardEvents = {
  "board:cellClicked": [{ x: number; y: number }];
};

export class CBoard extends CContainer<TNone, TBoardEvents> {
  private readonly rows: number;
  private readonly columns: number;
  private readonly playable: ReadonlySet<CellId>;
  private readonly pieces = new Map<number, CPiece>();
  private readonly layers = new Map<number, CLayer>();
  private readonly soilContainer = new Container();
  private readonly pieceContainer = new Container();
  private readonly layerContainer = new Container();
  readonly effectContainer = new Container();

  constructor(state: TGameState) {
    super();

    this.rows = state.rows;
    this.columns = state.columns;
    this.playable = new Set(state.board.keys());

    this.container.addChild(
      this.soilContainer,
      this.pieceContainer,
      this.layerContainer,
      this.effectContainer,
    );
    this.createCells();
  }

  render(state: TGameState) {
    const placements: TPiecePlacement[] = [];
    const covers: TViewEntry<TBlockerLayer>[] = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        const cell = state.board.get(cellIdFromXY(x, y));
        if (!cell) continue;
        const at = this.positionOf(x, y);
        const hidden = blocksAdjacency(cell);
        for (const layer of cell.layers) {
          if (layer.kind === "PIECE") {
            if (!hidden) placements.push({ piece: layer.piece, ...at });
            continue;
          }
          covers.push({ key: layer.id, datum: layer, ...at });
        }
      }
    }

    syncPieceViews(this.pieces, this.pieceContainer, placements);
    syncViews(
      this.layers,
      this.layerContainer,
      covers,
      (layer) => new CLayer(layer),
    );
  }

  positionOfCell(cellId: CellId): { x: number; y: number } | null {
    if (!this.playable.has(cellId)) return null;
    const { x, y } = xyFromCellId(cellId);
    return this.positionOf(x, y);
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
