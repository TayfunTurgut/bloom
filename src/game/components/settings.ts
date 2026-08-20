import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { CContainer, type TNone } from "../../engine/container";
import { getAsset } from "../assets";
import { CAnimations, tween } from "./motion";
import { SKINS } from "../config/skins";
import { COLOR_FONT_FILL_BROWN } from "../colors";
import config from "../config";

export type TShopView = {
  leaves: number;
  ownedSkins: readonly string[];
  selectedSkin: string;
};

export type TSettingsEvents = {
  "settings:buy": [string];
  "settings:select": [string];
  "settings:close": [];
};

const PANEL_W = config.width * 0.88;
const PANEL_H = 780;
const CX = config.width * 0.5;
const CY = config.height * 0.5;
const PANEL_TOP = CY - PANEL_H * 0.5;
const ROW_W = PANEL_W - 64;
const ROW_H = 176;
const ROWS_TOP = PANEL_TOP + 256;

const PANEL_FILL = 0xf5e7cf;
const PANEL_BORDER = 0x8a5a3b;
const ROW_FILL = 0xe9d3b3;
const BTN_FILL = 0x7cb342;
const BTN_DISABLED = 0xb3aa99;

export class CSettingsOverlay extends CContainer<TNone, TSettingsEvents> {
  private readonly animations = new CAnimations();
  private readonly panel = new Container();
  private readonly rowsLayer = new Container();
  private balance!: Text;

  constructor(view: TShopView) {
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
        .roundRect(CX - PANEL_W * 0.5, PANEL_TOP, PANEL_W, PANEL_H, 36)
        .fill({ color: PANEL_FILL })
        .stroke({ color: PANEL_BORDER, width: 8 }),
    );

    this.panel.addChild(
      this.text("Skins", 56, COLOR_FONT_FILL_BROWN, CX, PANEL_TOP + 70),
    );

    const leaf = new Sprite(getAsset<Texture>("leaf-icon"));
    leaf.anchor.set(0.5);
    leaf.scale.set(40 / Math.max(leaf.width, leaf.height));
    leaf.position.set(CX - 40, PANEL_TOP + 150);
    this.panel.addChild(leaf);
    this.balance = this.text(
      String(view.leaves),
      44,
      COLOR_FONT_FILL_BROWN,
      CX + 10,
      PANEL_TOP + 150,
    );
    this.balance.anchor.set(0, 0.5);
    this.panel.addChild(this.balance);

    const close = new Sprite(getAsset<Texture>("btn-close"));
    close.anchor.set(0.5);
    close.scale.set(64 / Math.max(close.width, close.height));
    close.position.set(CX + PANEL_W * 0.5 - 46, PANEL_TOP + 46);
    close.eventMode = "static";
    close.cursor = "pointer";
    close.on("pointertap", () => this.emit("settings:close"));
    this.panel.addChild(close);

    this.panel.addChild(this.rowsLayer);
    this.buildRows(view);

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

  update(view: TShopView) {
    this.balance.text = view.leaves;
    this.buildRows(view);
  }

  destroy() {
    this.animations.stopAll();
    this.container.destroy({ children: true });
  }

  private buildRows(view: TShopView) {
    for (const child of this.rowsLayer.removeChildren()) child.destroy();

    SKINS.forEach((skin, index) => {
      const row = new Container();
      row.position.set(CX, ROWS_TOP + index * ROW_H);
      row.addChild(
        new Graphics()
          .roundRect(-ROW_W * 0.5, -ROW_H * 0.5 + 10, ROW_W, ROW_H - 20, 24)
          .fill({ color: ROW_FILL }),
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
        .fill({ color: enabled ? BTN_FILL : BTN_DISABLED }),
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
