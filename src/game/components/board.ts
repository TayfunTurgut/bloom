import { CCell, CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import { CPiece } from "./piece";
import { CContainer, type TNone } from "../../engine/container";

type IBoardOptions = {
  rows: number;
  columns: number;
};

export type TBoardEvents = {
  "board:cellClicked": [{ cell: CCell }];
};

export class CBoard extends CContainer<TNone, TBoardEvents> {
  constructor(private readonly options: IBoardOptions) {
    super();

    this.init();
  }

  addFlowerView({ flower, x, y }: { flower: CPiece; x: number; y: number }) {
    this.container.addChild(flower.container);

    const { columns, rows } = this.options;
    const totalWidth = CCELL_WIDTH * columns;
    const totalHeight = CCELL_HEIGHT * rows;
    flower.container.position.set(
      -totalWidth * 0.5 + CCELL_WIDTH * 0.5 + CCELL_WIDTH * x,
      -totalHeight * 0.5 + CCELL_HEIGHT * 0.5 + CCELL_HEIGHT * y,
    );
  }

  private init() {
    const { columns, rows } = this.options;
    const totalWidth = CCELL_WIDTH * columns;
    const totalHeight = CCELL_HEIGHT * rows;
    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        const cell = new CCell({ x, y });
        this.container.addChild(cell.container);

        cell.container.position.set(
          -totalWidth * 0.5 + CCELL_WIDTH * 0.5 + CCELL_WIDTH * x,
          -totalHeight * 0.5 + CCELL_HEIGHT * 0.5 + CCELL_HEIGHT * y,
        );

        // "pointertap" fires for mouse and touch; "click" is mouse-only.
        cell.on("pointertap", () => this.onCellClicked(cell), this);
      }
    }
  }

  private onCellClicked(cell: CCell) {
    this.emit("board:cellClicked", { cell });
  }
}
