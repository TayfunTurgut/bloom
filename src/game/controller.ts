import { Container } from "pixi.js";
import { CircularProgressBar } from "@pixi/ui";
import config from "./config";
import { COLOR_BACKGROUND, COLOR_GOAL_PROGRESS_FILL } from "./colors";
import { onResize } from "../engine/resize";
import { CContainer } from "../engine/container";
import type { IEngine } from "../engine/app";
import { CGoalPanel } from "./components/goal/panel";
import { CBoard } from "./components/board";
import { CEffects, EFFECT_STAGGER } from "./components/fx";
import { CTray } from "./components/tray";
import { CLeafCounter } from "./components/leaf";
import { CLevelEndOverlay } from "./components/win";
import { createBackground } from "./components/background";
import { bindAnimationsTo, CAnimations, tween } from "./components/motion";
import { CCELL_HEIGHT, CCELL_WIDTH } from "./components/cell";
import { fromSnapshot, toSnapshot } from "./model/serialize";
import { CGameStore } from "./model/store";
import {
  createInitialState,
  isLevelFailed,
  isLevelWon,
  milestonesReached,
} from "./model/rules";
import { generateLevel } from "./config/generate";
import { advanceProgress, WRAP_BONUS_LEAVES } from "./config/progression";
import { skinById } from "./config/skins";
import { CSettingsOverlay, type TShopView } from "./components/settings";
import { CTutorialOverlay, lessonForLevel } from "./components/tutorial";
import type { TGameState, TMoveReport } from "./model/types";
import { saveSaveState, loadSaveState } from "./state";
import { loadProfile, saveProfile } from "./state/profile";
import type { AssetKey } from "../assetpack/assets";

const STATIC_ASSET_KEYS: readonly AssetKey[] = [
  "game-grid-bg",
  "bottom-bar",
  "top-game-bar",
  "pieces-needed-bg",
  "background_seamless",
  "window-bar-vertical",
  "Baloo2-Bold",
  "Baloo2-Regular",
];

const LEVEL_END_BEAT = 0.3;

export class CGameController extends CContainer {
  private store!: CGameStore;
  private panel!: CGoalPanel;
  private board!: CBoard;
  private tray!: CTray;
  private effects!: CEffects;
  private leafCounter!: CLeafCounter;
  private levelContainer!: Container;
  private overlay: CLevelEndOverlay | null = null;
  private settingsOverlay: CSettingsOverlay | null = null;
  private tutorialOverlay: CTutorialOverlay | null = null;
  private unsubscribe: (() => void) | null = null;
  private profile = loadProfile();
  private currentSkinId!: string;
  private generation = 0;
  private readonly animations = new CAnimations();

  constructor(private readonly engine: IEngine<AssetKey>) {
    super();
  }

  async start() {
    const { app, assets } = this.engine;
    bindAnimationsTo(app.ticker);

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

    await assets.load(
      ["hud", "pieces", "anim", ...STATIC_ASSET_KEYS],
      (progress) => {
        progressBar.progress = progress * 100;
      },
    );
    progressBar.destroy();

    app.stage.addChild(createBackground(app));
    onResize(app, (w, h) => this.onResize(w, h), this.container);
    app.stage.addChild(this.container);

    this.leafCounter = new CLeafCounter(this.profile.leaves);

    const save = loadSaveState();
    const skin = skinById(save.skin);
    this.currentSkinId = skin.id;

    const forced = devLevel();
    if (forced !== undefined) {
      const level = generateLevel(forced, skin);
      this.startLevel(createInitialState(forced, level, devSeed()));
      return;
    }

    const level = generateLevel(save.level, skin);
    const restored = fromSnapshot(save, save.level, level);
    this.startLevel(
      restored ?? createInitialState(save.level, level, devSeed()),
    );
  }

  private startLevel(state: TGameState) {
    this.levelContainer = new Container();
    this.container.addChild(this.levelContainer);
    this.container.addChild(this.leafCounter.container);

    this.store = new CGameStore(state);

    this.panel = new CGoalPanel(state);
    this.levelContainer.addChild(this.panel.container);

    this.board = new CBoard(state);
    this.board.on("board:cellClicked", ({ x, y }) => this.store.place(x, y));
    this.levelContainer.addChild(this.board.container);

    this.tray = new CTray();
    this.tray.on("tray:swapClicked", () => this.store.swapTray());
    this.tray.on("tray:settingsClicked", () => this.openSettings());
    this.levelContainer.addChild(this.tray.container);

    const overlayFx = new Container();
    this.levelContainer.addChild(overlayFx);
    this.effects = new CEffects(this.board.effectContainer, overlayFx);

    this.unsubscribe = this.store.subscribe((next, report) => {
      saveSaveState(toSnapshot(next, this.currentSkinId));
      if (!report) {
        this.render(next);
        return;
      }
      if (report.effects.some((effect) => effect.type === "PIECE_PLACED")) {
        void this.presentMove(next, report);
        return;
      }
      this.render(next);
      for (const effect of report.effects) {
        if (effect.type === "TRAY_SWAPPED")
          this.tray.playSwap(effect.a, effect.b);
      }
    });
    this.render(state);
    saveSaveState(toSnapshot(state, this.currentSkinId));

    this.layout(state.rows, state.columns);

    if (isLevelWon(state)) {
      this.showLevelEnd(true, milestonesReached(state));
    } else if (isLevelFailed(state)) {
      this.showLevelEnd(false, milestonesReached(state));
    } else {
      this.maybeShowTutorial(state.level);
    }

    this.levelContainer.alpha = 0;
    this.animations.track(
      tween(0, 1, {
        duration: 0.35,
        ease: "easeOut",
        onUpdate: (t) => {
          if (!this.levelContainer.destroyed) this.levelContainer.alpha = t;
        },
      }),
    );

    if (import.meta.env.DEV) {
      Object.assign(window, {
        __sprout: {
          store: this.store,
          app: this.engine.app,
          controller: this,
        },
      });
    }
  }

  private endLevel() {
    this.generation += 1;
    this.animations.stopAll();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.overlay?.destroy();
    this.overlay = null;
    this.settingsOverlay?.destroy();
    this.settingsOverlay = null;
    this.tutorialOverlay?.destroy();
    this.tutorialOverlay = null;
    this.effects.destroy();
    this.tray.destroy();
    this.board.destroy();
    this.levelContainer.destroy({ children: true });
  }

  private render(state: TGameState) {
    this.panel.render(state);
    this.board.render(state);
    this.tray.render(state);
  }

  private async presentMove(state: TGameState, report: TMoveReport) {
    const generation = this.generation;
    this.lockInput();
    this.tray.render(state);
    for (const effect of report.effects) {
      if (effect.type === "PIECE_PLACED") {
        this.board.applyPlacement(state, effect.cell);
      }
    }

    const fed = report.effects.find((effect) => effect.type === "FED");
    if (fed) {
      const from = this.board.positionOfCell(fed.from);
      const to = this.board.positionOfCell(fed.to);
      if (from && to) {
        await this.effects.feed(fed.assetKey, fed.amount, from, to);
        if (generation !== this.generation) return;
      }
      this.board.showFedValue(fed.targetId, fed.remaining);
    }

    const harvested = report.effects.filter(
      (effect) => effect.type === "HARVESTED",
    );
    if (harvested.length > 0) {
      const waits: Promise<void>[] = [];
      harvested.forEach((effect, index) => {
        const at = this.board.positionOfCell(effect.cell);
        if (!at) {
          this.board.removePiece(effect.pieceId);
          return;
        }
        const delay = index * EFFECT_STAGGER;
        waits.push(
          this.effects.vanish(at, delay, () =>
            this.board.removePiece(effect.pieceId),
          ),
        );
        if (effect.crop !== "GROWING") return;
        const goal = this.panel.goalGlobalPosition(effect.assetKey);
        if (goal) this.effects.flyToGoal(effect.assetKey, at, goal, delay);
        else this.effects.rain(effect.assetKey, at, delay);
      });
      await Promise.all(waits);
      if (generation !== this.generation) return;
    }

    this.panel.render(state);
    for (const effect of report.effects) {
      if (effect.type === "MILESTONE_REACHED") this.awardLeaf(effect.index);
    }
    this.board.render(state);

    const won = report.effects.find((effect) => effect.type === "LEVEL_WON");
    const failed = report.effects.some(
      (effect) => effect.type === "LEVEL_FAILED",
    );
    if (!won && !failed) {
      this.unlockInput();
      return;
    }
    await this.animations.delay(LEVEL_END_BEAT);
    if (generation !== this.generation) return;
    this.showLevelEnd(!!won, won ? won.milestones : milestonesReached(state));
  }

  private awardLeaf(index: number) {
    this.profile = { ...this.profile, leaves: this.profile.leaves + 1 };
    saveProfile(this.profile);
    const from = this.container.toLocal(this.panel.pipGlobalPosition(index));
    this.leafCounter.award(this.profile.leaves, from);
  }

  private lockInput() {
    this.board.container.interactiveChildren = false;
    this.tray.container.interactiveChildren = false;
  }

  private unlockInput() {
    this.board.container.interactiveChildren = true;
    this.tray.container.interactiveChildren = true;
  }

  private maybeShowTutorial(level: number) {
    if (this.profile.tutorialsSeen.includes(level)) return;
    const lesson = lessonForLevel(level);
    if (!lesson) return;
    this.lockInput();
    const overlay = new CTutorialOverlay(lesson);
    this.tutorialOverlay = overlay;
    this.levelContainer.addChild(overlay.container);
    overlay.once("tutorial:dismiss", () => {
      this.profile = {
        ...this.profile,
        tutorialsSeen: [...this.profile.tutorialsSeen, level],
      };
      saveProfile(this.profile);
      overlay.destroy();
      this.tutorialOverlay = null;
      this.unlockInput();
    });
  }

  private openSettings() {
    if (this.settingsOverlay || this.overlay || this.tutorialOverlay) return;
    this.lockInput();
    const overlay = new CSettingsOverlay(this.shopView());
    this.settingsOverlay = overlay;
    this.levelContainer.addChild(overlay.container);
    overlay.on("settings:buy", (id) => this.buySkin(id));
    overlay.on("settings:select", (id) => this.selectSkin(id));
    overlay.on("settings:close", () => this.closeSettings());
  }

  private shopView(): TShopView {
    return {
      leaves: this.profile.leaves,
      ownedSkins: this.profile.ownedSkins,
      selectedSkin: this.profile.selectedSkin,
    };
  }

  private buySkin(id: string) {
    const skin = skinById(id);
    if (this.profile.ownedSkins.includes(id)) return;
    if (this.profile.leaves < skin.price) return;
    this.profile = {
      ...this.profile,
      leaves: this.profile.leaves - skin.price,
      ownedSkins: [...this.profile.ownedSkins, id],
      selectedSkin: id,
    };
    saveProfile(this.profile);
    this.leafCounter.setCount(this.profile.leaves);
    this.settingsOverlay?.update(this.shopView());
  }

  private selectSkin(id: string) {
    if (!this.profile.ownedSkins.includes(id)) return;
    this.profile = { ...this.profile, selectedSkin: id };
    saveProfile(this.profile);
    this.settingsOverlay?.update(this.shopView());
  }

  private closeSettings() {
    this.settingsOverlay?.destroy();
    this.settingsOverlay = null;
    this.unlockInput();
  }

  private showLevelEnd(won: boolean, milestones: number) {
    if (this.overlay) return;
    this.lockInput();
    const overlay = new CLevelEndOverlay(won, milestones);
    this.overlay = overlay;
    this.levelContainer.addChild(overlay.container);
    overlay.once("levelEnd:continue", () => this.advanceLevel());
  }

  private advanceLevel() {
    const result = advanceProgress(
      this.store.state.level,
      this.profile.endless,
    );
    this.profile = { ...this.profile, endless: result.endless };
    if (result.awardBonus) {
      this.profile = {
        ...this.profile,
        leaves: this.profile.leaves + WRAP_BONUS_LEAVES,
      };
    }
    saveProfile(this.profile);
    if (result.awardBonus) this.leafCounter.setCount(this.profile.leaves);

    this.endLevel();
    const skin = skinById(this.profile.selectedSkin);
    this.currentSkinId = skin.id;
    const level = generateLevel(result.index, skin);
    const state = createInitialState(result.index, level, devSeed());
    this.startLevel(state);
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

const devSeed = (): number | undefined => {
  if (!import.meta.env.DEV) return undefined;
  const value = new URLSearchParams(window.location.search).get("seed");
  return value === null ? undefined : Number(value) | 0;
};

const devLevel = (): number | undefined => {
  if (!import.meta.env.DEV) return undefined;
  const value = new URLSearchParams(window.location.search).get("level");
  if (value === null) return undefined;
  return Math.max(0, Number(value) | 0);
};
