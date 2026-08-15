import { CircularProgressBar } from "@pixi/ui";
import config from "./config";
import { COLOR_BACKGROUND, COLOR_GOAL_PROGRESS_FILL } from "./colors";
import { onResize } from "../engine/resize";
import { CContainer } from "../engine/container";
import type { IEngine } from "../engine/app";
import { CGoalPanel } from "./components/goal/panel";
import { CBoard } from "./components/board";
import { CEffects } from "./components/fx";
import { LAYER_ASSET_KEYS } from "./components/layer";
import { CTray } from "./components/tray";
import { CCELL_HEIGHT, CCELL_WIDTH } from "./components/cell";
import { createInitialState } from "./model/rules";
import { fromSnapshot, toSnapshot } from "./model/serialize";
import { CGameStore } from "./model/store";
import type { TMoveReport } from "./model/resolve";
import type { TGameState } from "./model/types";
import { loadSaveState, saveSaveState } from "./state";
import type { AssetKey } from "../assetpack/assets";

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

/**
 * Wires input to the store and the store to the views. It keeps no game data
 * of its own: `store.state` is the single source of truth, and every view
 * redraws from it on change.
 */
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

    const save = loadSaveState();
    // Wrap rather than clamp: a save pointing past the shipped levels still
    // lands on a real index, and fromSnapshot's own level check then rejects
    // it, so the player gets a fresh game rather than an out-of-range read.
    const currentLevel = save.level % config.levels.length;
    const level = config.levels[currentLevel];

    // Load only what this level needs; the atlas library is far too large to
    // load wholesale (>1GB decoded on a 62-page manifest).
    await assets.load(
      [
        ...STATIC_ASSET_KEYS,
        // Every registered cover's art, not just the kinds this level
        // authors. There are two kinds and a handful of small frames; when the
        // registry outgrows that, narrow this by scanning level.data.
        ...LAYER_ASSET_KEYS,
        ...level.pieces,
        ...level.goals.map((goal) => goal.type),
      ],
      (progress) => {
        progressBar.progress = progress * 100;
      },
    );
    // Destroy after the await: onProgress may never fire for cached loads.
    progressBar.destroy();

    // A save that doesn't fit the level as it ships today is discarded rather
    // than patched up, so a level edit can never resurrect a broken board.
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

    this.effects = new CEffects(this.board.effectContainer, app.ticker);

    this.tray = new CTray();
    this.container.addChild(this.tray.container);

    this.store.subscribe((next, report) => {
      this.render(next, report);
      saveSaveState(toSnapshot(next));
    });
    this.render(state);
    // Persist the opening position too, so a reload before the first move
    // resumes the same tray rather than rerolling it.
    saveSaveState(toSnapshot(state));

    this.layout(state.rows, state.columns);

    app.stage.addChild(this.container);
  }

  /**
   * The views redraw from `state` alone — that is still the whole truth of what
   * the board is. `report` is only ever the ordered account of what *happened*,
   * and only the effects layer reads it: the opening render has no move behind
   * it and passes none, which is why it is optional here rather than a gap.
   */
  private render(state: TGameState, report?: TMoveReport) {
    this.panel.render(state);
    this.board.render(state);
    this.tray.render(state);
    if (report) {
      this.effects.play(report, (cell) => this.board.positionOfCell(cell));
    }
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

  private onResize(w: number, h: number) {
    const scale = Math.min(w / config.width, h / config.height);
    this.container.scale.set(scale);
    this.container.position.set(
      (w - config.width * scale) * 0.5,
      (h - config.height * scale) * 0.5,
    );
  }
}
