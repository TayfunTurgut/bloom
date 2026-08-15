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

/**
 * The view of the board half of the state. It holds no idea of what is stacked
 * where — `render` reads that from the state every time.
 */
export class CBoard extends CContainer<TNone, TBoardEvents> {
  private readonly rows: number;
  private readonly columns: number;
  private readonly playable: ReadonlySet<CellId>;
  private readonly pieces = new Map<number, CPiece>();
  private readonly layers = new Map<number, CLayer>();
  // Three explicit containers rather than one, because the reconcilers add and
  // remove children as the board changes and insertion order alone would stop
  // holding: soil under flowers under covers, always.
  private readonly soilContainer = new Container();
  private readonly pieceContainer = new Container();
  private readonly layerContainer = new Container();
  /** Above everything, so a burst is never clipped by a neighbouring cell. */
  readonly effectContainer = new Container();

  constructor(state: TGameState) {
    super();

    this.rows = state.rows;
    this.columns = state.columns;
    // Fixed once, at construction: a layer never adds or removes a cell, and
    // placement only ever writes to a cell that already passed canPlace, so
    // the board's key set never changes in play.
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
        // The same predicate the drain rules use, so the picture and the rules
        // tell one story: a flower the rules treat as out of play is a flower
        // the player cannot see. Cover art is not opaque, so leaving the sprite
        // underneath would show a flower through the leaves that neither
        // counts nor drains.
        const hidden = blocksAdjacency(cell);
        // Walked bottom to top so the covers of one cell reach syncViews in
        // stacking order — see the note there on addChild and child order.
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

  /** Where an effect aimed at `cellId` should play, in this board's own
   *  coordinates. Null for a cell that is not on this board. */
  positionOfCell(cellId: CellId): { x: number; y: number } | null {
    if (!this.playable.has(cellId)) return null;
    const { x, y } = xyFromCellId(cellId);
    return this.positionOf(x, y);
  }

  private createCells() {
    for (let x = 0; x < this.columns; x++) {
      for (let y = 0; y < this.rows; y++) {
        // A hole keeps its slot in the grid but grows no soil and takes no tap.
        if (!this.playable.has(cellIdFromXY(x, y))) continue;

        const cell = new CCell({ x, y });
        this.soilContainer.addChild(cell.container);
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
