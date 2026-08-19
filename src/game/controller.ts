import { CircularProgressBar } from "@pixi/ui";
import config from "./config";
import { COLOR_BACKGROUND, COLOR_GOAL_PROGRESS_FILL } from "./colors";
import { onResize } from "../engine/resize";
import { CContainer } from "../engine/container";
import type { IEngine } from "../engine/app";
import { CGoalPanel } from "./components/goal/panel";
import { CBoard } from "./components/board";
import { CEffects } from "./components/fx";
import { CTray } from "./components/tray";
import { CCELL_HEIGHT, CCELL_WIDTH } from "./components/cell";
import { fromSnapshot, toSnapshot } from "./model/serialize";
import { CGameStore } from "./model/store";
import type { TMoveReport } from "./model/resolve";
import type { TGameState } from "./model/types";
import { saveSaveState, loadSaveState } from "./state";
import type { AssetKey } from "../assetpack/assets";
import { createInitialState } from "./model/rules";

const STATIC_ASSET_KEYS: readonly AssetKey[] = [
  "game-grid-bg",
  "bottom-bar",
  "top-game-bar",
  "pieces-needed-bg",
  "Baloo2-Bold",
  "Baloo2-Regular",
];

export class CGameController extends CContainer {
  private store!: CGameStore;
  private panel!: CGoalPanel;
  private board!: CBoard;
  private tray!: CTray;
  private effects!: CEffects;

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

    await assets.load(["hud", "pieces", ...STATIC_ASSET_KEYS], (progress) => {
      progressBar.progress = progress * 100;
    });
    progressBar.destroy();

    const save = loadSaveState();
    const currentLevel = save.level % config.levels.length;
    const level = config.levels[currentLevel];
    const restored = fromSnapshot(save, currentLevel, level);
    this.createGameContainer(
      restored ?? createInitialState(currentLevel, level),
    );
  }

  private createGameContainer(state: TGameState) {
    const app = this.engine.app;
    onResize(app, (w, h) => this.onResize(w, h), this.container);

    this.store = new CGameStore(state);

    this.panel = new CGoalPanel(state);
    this.container.addChild(this.panel.container);

    this.board = new CBoard(state);
    this.board.on("board:cellClicked", ({ x, y }) => this.store.place(x, y));
    this.container.addChild(this.board.container);

    this.effects = new CEffects(this.board.effectContainer);

    this.tray = new CTray();
    this.container.addChild(this.tray.container);

    this.store.subscribe((next, report) => {
      this.render(next, report);
      saveSaveState(toSnapshot(next));
    });
    this.render(state);
    saveSaveState(toSnapshot(state));

    this.layout(state.rows, state.columns);

    app.stage.addChild(this.container);
  }

  private render(state: TGameState, report?: TMoveReport) {
    this.panel.render(state);
    this.board.render(state);
    this.tray.render(state);
    if (report) {
      this.effects.play(report, (cell) => this.board.positionOfCell(cell));
    }
  }

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

  private onResize(w: number, h: number) {
    const scale = Math.min(w / config.width, h / config.height);
    this.container.scale.set(scale);
    this.container.position.set(
      (w - config.width * scale) * 0.5,
      (h - config.height * scale) * 0.5,
    );
  }
}
