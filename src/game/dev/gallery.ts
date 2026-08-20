import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { getAsset } from "../assets";
import { COLOR_FONT_FILL_BROWN, COLOR_PANEL_FILL } from "../colors";
import config from "../config";
import type { TSkin } from "../config/skins";
import type { AssetKey } from "../../assetpack/assets";

const COLS = 5;
const CELL_W = config.width / COLS;
const CELL_H = 190;
const GRID_TOP = 150;
const CROP_BOX = 110;
const BASELINE_OFFSET = 138;

const GROWTH_KEYS: readonly AssetKey[] = [
  "block0",
  "block1",
  "block2",
  "block3",
];
const GROWTH_LABELS = ["10-12", "7-9", "4-6", "1-3"];

const font = () => getAsset<FontFace>("Baloo2-Bold").family;

const label = (value: string, size: number, x: number, y: number): Text => {
  const text = new Text({
    text: value,
    style: {
      fontFamily: font(),
      fontWeight: "bold",
      fontSize: size,
      fill: COLOR_FONT_FILL_BROWN,
      align: "center",
    },
  });
  text.anchor.set(0.5);
  text.position.set(x, y);
  return text;
};

export const buildGallery = (skin: TSkin): Container => {
  const root = new Container();

  root.addChild(
    new Graphics()
      .rect(0, 0, config.width, config.height)
      .fill({ color: COLOR_PANEL_FILL, alpha: 0.94 }),
  );

  root.addChild(label(`Gallery — ${skin.name}`, 46, config.width * 0.5, 70));

  skin.crops.forEach((key, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const cx = col * CELL_W + CELL_W * 0.5;
    const baseY = GRID_TOP + row * CELL_H + BASELINE_OFFSET;

    root.addChild(
      new Graphics()
        .moveTo(cx - CELL_W * 0.42, baseY)
        .lineTo(cx + CELL_W * 0.42, baseY)
        .stroke({ color: COLOR_FONT_FILL_BROWN, width: 2, alpha: 0.4 }),
    );

    const crop = new Sprite(getAsset<Texture>(key));
    crop.anchor.set(0.5, 1);
    const source = crop.texture.orig;
    crop.scale.set(Math.min(CROP_BOX / source.width, CROP_BOX / source.height));
    crop.position.set(cx, baseY);
    root.addChild(crop);

    root.addChild(label(key.replace(/_happy$/, ""), 20, cx, baseY + 26));
  });

  const growthY = GRID_TOP + 3 * CELL_H + 30;
  root.addChild(label("Growth stages", 32, config.width * 0.5, growthY));
  GROWTH_KEYS.forEach((key, index) => {
    const cx = (index + 0.5) * (config.width / GROWTH_KEYS.length);
    const block = new Sprite(getAsset<Texture>(key));
    block.anchor.set(0.5);
    block.setSize(96, 96);
    block.position.set(cx, growthY + 90);
    root.addChild(block);
    root.addChild(label(GROWTH_LABELS[index], 22, cx, growthY + 158));
  });

  return root;
};
