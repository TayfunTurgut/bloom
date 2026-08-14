import { CBaseController } from "./index";
import config from "../config";
import { type ApplicationOptions, Assets } from "pixi.js";
import { CircularProgressBar } from "@pixi/ui";
import { COLOR_BACKGROUND, COLOR_GOAL_PROGRESS_FILL } from "../utils/color";
import { onResize } from "../utils/resize";
import { CGoalPanel } from "../components/goal/panel";
import { CBoard } from "../components/board";
import { CTray } from "../components/tray";
import { CCell, CCELL_HEIGHT, CCELL_WIDTH } from "../components/cell";
import { CPiece, EFlowerType } from "../components/piece";
import { CellId, cellIdFromXY } from "../utils/id";
import { loadSaveState } from "../state";
import type { AssetKey } from "../assetpack/assets";

interface IGameState {
  level: number; // current level index
  moves: number; // move counter shown in the HUD
  goals: { type: AssetKey; target: number; progress: number }[];
  board: Map<CellId, CPiece | null>; // board model — what is placed where
}

export class CGameController extends CBaseController {
  private state!: IGameState;
  private panel!: CGoalPanel;
  private board!: CBoard;
  private tray!: CTray;

  async init(options?: Partial<ApplicationOptions>) {
    await this.app.init({
      background: COLOR_BACKGROUND,
      resizeTo: window,
      ...options,
    });

    const pixiContainer = document.getElementById("pixi-container");
    if (!pixiContainer) {
      throw new Error("PixiContainer not found");
    }
    pixiContainer.appendChild(this.app.canvas);

    const progressBar = new CircularProgressBar({
      backgroundColor: COLOR_BACKGROUND,
      backgroundAlpha: 1,
      fillColor: COLOR_GOAL_PROGRESS_FILL,
      fillAlpha: 1,
      radius: 50,
      lineWidth: 12,
      value: 0,
      cap: "round",
    });
    this.app.stage.addChild(progressBar);
    onResize(
      this.app,
      (w, h) => {
        progressBar.position.set(w * 0.5, h * 0.5);
      },
      progressBar,
    );

    await Assets.init({
      basePath: "/assets/",
      manifest: "manifest.json",
    });
    await Assets.loadBundle("default", (progress) => {
      progressBar.progress = progress * 100;
      if (progress >= 1) {
        progressBar.destroy();
      }
    });

    this.createGameContainer();

    return this.app;
  }

  private createGameContainer() {
    onResize(this.app, (w, h) => this.onResize(w, h), this.container);

    const { level: currentLevel } = loadSaveState();
    const level = config.levels[currentLevel];
    const columns = level.columns;
    const rows = level.data.length / columns;

    const board = new Map<CellId, CPiece | null>();
    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        board.set(cellIdFromXY(x, y), null);
      }
    }

    this.state = {
      level: currentLevel,
      moves: 0,
      goals: level.goals.map((goal) => ({
        type: goal.type,
        target: goal.count,
        progress: 0,
      })),
      board,
    };

    this.panel = new CGoalPanel({
      goals: level.goals,
      level: currentLevel + 1,
    });
    this.container.addChild(this.panel.container);

    this.board = new CBoard({ rows, columns });
    this.board.on("board:cellClicked", ({ cell }) =>
      this.handleCellClicked(cell),
    );
    this.container.addChild(this.board.container);

    this.tray = new CTray({ pieces: level.pieces });
    this.container.addChild(this.tray.container);

    this.layout(rows, columns);

    this.addContainerToStage();
  }

  // Pin the goal panel to the top and the tray to the bottom, then scale the
  // board to fill whatever vertical space remains between them.
  private layout(rows: number, columns: number) {
    const TOP_MARGIN = 0;
    const BOTTOM_MARGIN = 0;
    const SIDE_MARGIN = 24;
    const GAP = 24;

    const panelBounds = this.panel.container.getLocalBounds();
    const panelY = TOP_MARGIN - panelBounds.y;
    this.panel.container.position.set(config.width * 0.5, panelY);
    const panelBottom = TOP_MARGIN + panelBounds.height;

    const trayBounds = this.tray.container.getLocalBounds();
    const trayY =
      config.height - BOTTOM_MARGIN - (trayBounds.y + trayBounds.height);
    this.tray.container.position.set(config.width * 0.5, trayY);
    const trayTop = config.height - BOTTOM_MARGIN - trayBounds.height;

    const boxTop = panelBottom + GAP;
    const boxBottom = trayTop - GAP;
    const availWidth = config.width - 2 * SIDE_MARGIN;
    const availHeight = boxBottom - boxTop;
    const naturalWidth = columns * CCELL_WIDTH;
    const naturalHeight = rows * CCELL_HEIGHT;
    const scale = Math.min(
      availWidth / naturalWidth,
      availHeight / naturalHeight,
    );
    this.board.container.scale.set(scale);
    this.board.container.position.set(
      config.width * 0.5,
      (boxTop + boxBottom) * 0.5,
    );
  }

  private handleCellClicked(cell: CCell) {
    const { x, y } = cell.data;
    if (this.state.board.get(cellIdFromXY(x, y))) {
      return; // cell already occupied
    }

    const flower = this.tray.pop();
    this.placeFlower(flower, x, y);
    this.tray.refill();
  }

  private placeFlower(flower: CPiece, x: number, y: number) {
    this.state.board.set(cellIdFromXY(x, y), flower);
    this.board.addFlowerView({ flower, x, y });

    const neighbors = this.getNeighbors(x, y);
    if (neighbors.length > 0) {
      flower.type = EFlowerType.SUPPLY;

      const targetFlower = neighbors.reduce((a, b) =>
        a.currentValue > b.currentValue ? a : b,
      );
      targetFlower.currentValue -= flower.currentValue;
    }

    this.state.moves += 1;
    // TODO: advance goal progress here once the rule for which placement
    // counts toward which goal is defined.
    this.updatePanel();
  }

  private getNeighbors(x: number, y: number): CPiece[] {
    const candidates = [
      this.state.board.get(cellIdFromXY(x + 1, y)),
      this.state.board.get(cellIdFromXY(x, y + 1)),
      this.state.board.get(cellIdFromXY(x - 1, y)),
      this.state.board.get(cellIdFromXY(x, y - 1)),
    ];
    return candidates.filter((c): c is CPiece => c != null);
  }

  private updatePanel() {
    this.panel.updateMoves(this.state.moves);
    this.state.goals.forEach((goal, index) => {
      const remaining = Math.max(0, goal.target - goal.progress);
      this.panel.updateGoal(index, remaining);
      this.panel.setGoalComplete(index, goal.progress >= goal.target);
    });
  }

  private onResize(w: number, h: number) {
    const scale = Math.min(w / config.width, h / config.height);
    this.container.scale.set(scale);
    this.container.position.set(
      (w - config.width * scale) * 0.5,
      (h - config.height * scale) * 0.5,
    );
  }
}
