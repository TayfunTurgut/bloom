import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { CheckBox, FancyButton } from "@pixi/ui";
import { CContainer, type TNone } from "../../engine/container";
import { getAsset } from "../assets";
import { CAnimations, tween } from "./motion";
import { SKINS } from "../config/skins";
import {
  COLOR_BUTTON_DISABLED,
  COLOR_BUTTON_FILL,
  COLOR_FONT_FILL_BROWN,
  COLOR_PANEL_BORDER,
  COLOR_PANEL_FILL,
  COLOR_PANEL_ROW,
  COLOR_PANEL_SHADOW,
} from "../colors";
import config from "../config";
import type { AssetKey } from "../../assetpack/assets";

export type TSettingsTab = "settings" | "skins" | "credits";

export type TSettingsView = {
  leaves: number;
  ownedSkins: readonly string[];
  selectedSkin: string;
  musicOn: boolean;
  sfxOn: boolean;
};

export type TSettingsEvents = {
  "settings:buy": [string];
  "settings:select": [string];
  "settings:close": [];
  "settings:musicToggled": [boolean];
  "settings:sfxToggled": [boolean];
};

const PANEL_W = config.width * 0.88;
const PANEL_H = 780;
const CX = config.width * 0.5;
const CY = config.height * 0.5;
const PANEL_TOP = CY - PANEL_H * 0.5;
const ROW_W = PANEL_W - 64;
const ROW_H = 176;
const ROWS_TOP = PANEL_TOP + 256;
const TAB_Y = PANEL_TOP + 78;
const TAB_W = 140;
const TAB_H = 72;
const TOGGLE_SIZE = 110;
const INACTIVE_TAB_ALPHA = 0.6;

const TABS: readonly { id: TSettingsTab; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "skins", label: "Skins" },
  { id: "credits", label: "Credits" },
];

const CREDITS = [
  "Art — Kawaii Farm Match-3 Asset Pack",
  "by monixxy (monixxy.itch.io)",
  "",
  "Sound effects — TT Soundeffects",
  "by sablebloom (sablebloom.itch.io)",
  "",
  'Music — "Farm Music" by migfus20',
  "OpenGameArt, OGA-BY 4.0",
  "",
  "Sprout © 2026 Melisa Turgut",
].join("\n");

export class CSettingsOverlay extends CContainer<TNone, TSettingsEvents> {
  private readonly animations = new CAnimations();
  private readonly panel = new Container();
  private readonly rowsLayer = new Container();
  private readonly tabs = new Map<
    TSettingsTab,
    { button: FancyButton; content: Container }
  >();
  private balance!: Text;
  private musicToggle!: CheckBox;
  private sfxToggle!: CheckBox;

  constructor(view: TSettingsView) {
    super();

    const dim = new Graphics()
      .rect(0, 0, config.width, config.height)
      .fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static";
    dim.cursor = "pointer";
    dim.on("pointertap", () => this.emit("settings:close"));
    this.container.addChild(dim);

    this.container.addChild(this.panel);
    this.panel.eventMode = "static";
    this.panel.addChild(
      new Graphics()
        .roundRect(CX - PANEL_W * 0.5, PANEL_TOP + 14, PANEL_W, PANEL_H, 40)
        .fill({ color: COLOR_PANEL_SHADOW, alpha: 0.3 }),
    );
    this.panel.addChild(
      new Graphics()
        .roundRect(CX - PANEL_W * 0.5, PANEL_TOP, PANEL_W, PANEL_H, 36)
        .fill({ color: COLOR_PANEL_FILL })
        .stroke({ color: COLOR_PANEL_BORDER, width: 8 }),
    );

    const close = new Sprite(getAsset<Texture>("btn-close"));
    close.anchor.set(0.5);
    close.scale.set(64 / Math.max(close.width, close.height));
    close.position.set(CX + PANEL_W * 0.5 - 46, PANEL_TOP + 46);
    close.eventMode = "static";
    close.cursor = "pointer";
    close.on("pointertap", () => this.emit("settings:close"));
    this.panel.addChild(close);

    this.buildTabs(view);

    const controls = tween(0, 1, {
      duration: 0.3,
      ease: "backOut",
      onUpdate: (t) => {
        if (!this.panel.destroyed) this.panel.scale.set(t);
      },
    });
    this.panel.pivot.set(CX, CY);
    this.panel.position.set(CX, CY);
    this.animations.track(controls);
  }

  update(view: TSettingsView) {
    this.balance.text = view.leaves;
    this.buildRows(view);
    this.musicToggle.forceCheck(view.musicOn);
    this.sfxToggle.forceCheck(view.sfxOn);
  }

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }

  private buildTabs(view: TSettingsView) {
    TABS.forEach(({ id, label }, index) => {
      const defaultView = new Sprite(getAsset<Texture>("btn-wide"));
      defaultView.setSize(TAB_W, TAB_H);
      const pressedView = new Sprite(getAsset<Texture>("btn-wide-pressed"));
      pressedView.setSize(TAB_W, TAB_H);
      const button = new FancyButton({
        defaultView,
        pressedView,
        text: this.text(label, 28, "#ffffff", 0, 0),
        anchor: 0.5,
      });
      button.position.set(CX + (index - 1) * (TAB_W + 12), TAB_Y);
      button.onPress.connect(() => this.showTab(id));
      this.panel.addChild(button);

      const content = new Container();
      content.visible = false;
      this.panel.addChild(content);
      this.tabs.set(id, { button, content });
    });

    this.buildSettingsTab(view);
    this.buildSkinsTab(view);
    this.buildCreditsTab();
    this.showTab("settings");
  }

  private showTab(active: TSettingsTab) {
    for (const [id, tab] of this.tabs) {
      tab.content.visible = id === active;
      tab.button.alpha = id === active ? 1 : INACTIVE_TAB_ALPHA;
    }
  }

  private content(id: TSettingsTab): Container {
    return this.tabs.get(id)!.content;
  }

  private buildSettingsTab(view: TSettingsView) {
    const content = this.content("settings");
    this.musicToggle = this.toggleRow(
      content,
      "Music",
      PANEL_TOP + 300,
      view.musicOn,
      ["btn-music-on", "btn-music-off"],
      (on) => this.emit("settings:musicToggled", on),
    );
    this.sfxToggle = this.toggleRow(
      content,
      "Sound",
      PANEL_TOP + 460,
      view.sfxOn,
      ["btn-sound-on", "btn-sound-off"],
      (on) => this.emit("settings:sfxToggled", on),
    );
  }

  private toggleRow(
    content: Container,
    label: string,
    y: number,
    checked: boolean,
    textures: [AssetKey, AssetKey],
    onCheck: (on: boolean) => void,
  ): CheckBox {
    const name = this.text(label, 44, COLOR_FONT_FILL_BROWN, 0, y);
    name.anchor.set(0, 0.5);
    name.position.x = CX - PANEL_W * 0.5 + 64;
    content.addChild(name);

    const checkedView = new Sprite(getAsset<Texture>(textures[0]));
    checkedView.setSize(TOGGLE_SIZE, TOGGLE_SIZE);
    const uncheckedView = new Sprite(getAsset<Texture>(textures[1]));
    uncheckedView.setSize(TOGGLE_SIZE, TOGGLE_SIZE);
    const toggle = new CheckBox({
      checked,
      style: { checked: checkedView, unchecked: uncheckedView },
    });
    toggle.position.set(
      CX + PANEL_W * 0.5 - 64 - TOGGLE_SIZE,
      y - TOGGLE_SIZE * 0.5,
    );
    toggle.onCheck.connect(onCheck);
    content.addChild(toggle);
    return toggle;
  }

  private buildSkinsTab(view: TSettingsView) {
    const content = this.content("skins");

    const leaf = new Sprite(getAsset<Texture>("leaf-icon"));
    leaf.anchor.set(0.5);
    leaf.scale.set(40 / Math.max(leaf.width, leaf.height));
    leaf.position.set(CX - 40, PANEL_TOP + 150);
    content.addChild(leaf);
    this.balance = this.text(
      String(view.leaves),
      44,
      COLOR_FONT_FILL_BROWN,
      CX + 10,
      PANEL_TOP + 150,
    );
    this.balance.anchor.set(0, 0.5);
    content.addChild(this.balance);

    content.addChild(this.rowsLayer);
    this.buildRows(view);
  }

  private buildCreditsTab() {
    const content = this.content("credits");
    const credits = new Text({
      text: CREDITS,
      style: {
        fontFamily: getAsset<FontFace>("Baloo2-Regular").family,
        fontSize: 30,
        lineHeight: 44,
        fill: COLOR_FONT_FILL_BROWN,
        align: "center",
        wordWrap: true,
        wordWrapWidth: PANEL_W - 100,
      },
    });
    credits.anchor.set(0.5);
    credits.position.set(CX, PANEL_TOP + 140 + (PANEL_H - 170) * 0.5);
    content.addChild(credits);
  }

  private buildRows(view: TSettingsView) {
    for (const child of this.rowsLayer.removeChildren()) child.destroy();

    SKINS.forEach((skin, index) => {
      const row = new Container();
      row.position.set(CX, ROWS_TOP + index * ROW_H);
      row.addChild(
        new Graphics()
          .roundRect(-ROW_W * 0.5, -ROW_H * 0.5 + 10, ROW_W, ROW_H - 20, 24)
          .fill({ color: COLOR_PANEL_ROW }),
      );

      skin.crops.slice(0, 3).forEach((key, slot) => {
        const crop = new Sprite(getAsset<Texture>(key));
        crop.anchor.set(0.5);
        crop.scale.set(56 / Math.max(crop.width, crop.height));
        crop.position.set(-ROW_W * 0.5 + 56 + slot * 48, -8);
        row.addChild(crop);
      });

      const name = this.text(
        skin.name,
        38,
        COLOR_FONT_FILL_BROWN,
        -ROW_W * 0.5 + 220,
        0,
      );
      name.anchor.set(0, 0.5);
      row.addChild(name);

      const owned = view.ownedSkins.includes(skin.id);
      const selected = view.selectedSkin === skin.id;
      const actionX = ROW_W * 0.5 - 100;

      if (selected) {
        const check = new Sprite(getAsset<Texture>("btn-check"));
        check.anchor.set(0.5);
        check.scale.set(64 / Math.max(check.width, check.height));
        check.position.set(actionX, 0);
        row.addChild(check);
      } else if (owned) {
        const button = this.actionButton("Select", true, false);
        button.position.set(actionX, 0);
        button.on("pointertap", () => this.emit("settings:select", skin.id));
        row.addChild(button);
      } else {
        const affordable = view.leaves >= skin.price;
        const button = this.actionButton(String(skin.price), affordable, true);
        button.position.set(actionX, 0);
        if (affordable) {
          button.on("pointertap", () => this.emit("settings:buy", skin.id));
        }
        row.addChild(button);
      }

      this.rowsLayer.addChild(row);
    });
  }

  private actionButton(
    label: string,
    enabled: boolean,
    showLeaf: boolean,
  ): Container {
    const button = new Container();
    const width = 168;
    const height = 68;
    button.addChild(
      new Graphics()
        .roundRect(-width * 0.5, -height * 0.5, width, height, 20)
        .fill({ color: enabled ? COLOR_BUTTON_FILL : COLOR_BUTTON_DISABLED }),
    );

    let textX = 0;
    if (showLeaf) {
      const leaf = new Sprite(getAsset<Texture>("leaf-icon"));
      leaf.anchor.set(0.5);
      leaf.scale.set(32 / Math.max(leaf.width, leaf.height));
      leaf.position.set(-width * 0.5 + 34, 0);
      button.addChild(leaf);
      textX = 18;
    }
    button.addChild(this.text(label, 34, "#ffffff", textX, 0));

    if (enabled) {
      button.eventMode = "static";
      button.cursor = "pointer";
    } else {
      button.alpha = 0.55;
    }
    return button;
  }

  private text(
    value: string,
    size: number,
    fill: string,
    x: number,
    y: number,
  ): Text {
    const text = new Text({
      text: value,
      style: {
        fontFamily: getAsset<FontFace>("Baloo2-Bold").family,
        fontWeight: "bold",
        fontSize: size,
        fill,
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.position.set(x, y);
    return text;
  }
}
