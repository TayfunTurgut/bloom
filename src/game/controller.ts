import { CircularProgressBar } from "@pixi/ui";
import config from "./config";
import type { TConfig } from "./config/schema";
import { COLOR_BACKGROUND, COLOR_GOAL_PROGRESS_FILL } from "./colors";
import { onResize } from "../engine/resize";
import { CContainer } from "../engine/container";
import type { IEngine } from "../engine/app";
import { CGoalPanel } from "./components/goal/panel";
import { CBoard } from "./components/board";
import { CTray } from "./components/tray";
import { CCell, CCELL_HEIGHT, CCELL_WIDTH } from "./components/cell";
import { CPiece, EFlowerType } from "./components/piece";
import { CellId, cellIdFromXY } from "./id";
import { loadSaveState } from "./state";
import type { AssetKey } from "../assetpack/assets";

type TLevel = TConfig["levels"][number];

/** Art every level needs regardless of its piece set. */
const STATIC_ASSET_KEYS: readonly AssetKey[] = [
  "tiles/dirt_tile", // board cells
  "bars/bar_wood_3", // tray background
  "decor/wood_arrow_down", // tray arrows
  "bars/plank_bar", // goal panel background
  "panels/rounded", // goal item background
  "badges/check_badge", // goal complete tick
  "badges/disc_brown", // hud move counter disc
  "Baloo2-Bold",
  "Baloo2-Regular",
];

interface IGameState {
  level: number; // current level index
  moves: number; // move counter shown in the HUD
  goals: { type: AssetKey; target: number; progress: number }[];
  board: Map<CellId, CPiece | null>; // board model — what is placed where
}

export class CGameController extends CContainer {
  private state!: IGameState;
  private panel!: CGoalPanel;
  private board!: CBoard;
  private tray!: CTray;

  constructor(private readonly engine: IEngine<AssetKey>) {
    super();
  }

  async start() {
    const { app, assets } = this.engine;

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
    app.stage.addChild(progressBar);
    onResize(
      app,
      (w, h) => {
        progressBar.position.set(w * 0.5, h * 0.5);
      },
      progressBar,
    );

    // Clamp so a stale save (level index beyond the shipped levels) can't crash.
    const currentLevel = loadSaveState().level % config.levels.length;
    const level = config.levels[currentLevel];

    // Load only what this level needs; the atlas library is far too large to
    // load wholesale (>1GB decoded on a 62-page manifest).
    await assets.load(
      [
        ...STATIC_ASSET_KEYS,
        ...level.pieces,
        ...level.goals.map((goal) => goal.type),
      ],
      (progress) => {
        progressBar.progress = progress * 100;
      },
    );
    // Destroy after the await: onProgress may never fire for cached loads.
    progressBar.destroy();

    this.createGameContainer(currentLevel, level);
  }

  private createGameContainer(currentLevel: number, level: TLevel) {
    const app = this.engine.app;
    onResize(app, (w, h) => this.onResize(w, h), this.container);

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

    app.stage.addChild(this.container);
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
