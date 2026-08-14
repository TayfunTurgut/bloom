import { Sprite, Text, Texture, type Container } from "pixi.js";
import { CContainer } from "../../../engine/container";
import { CGoalItem } from "./item";
import { CGoalHud } from "./hud";
import { getAsset } from "../../assets";
import { COLOR_FONT_FILL_BROWN } from "../../colors";
import config from "../../config";
import type { AssetKey } from "../../../assetpack/assets";

type TGoalPanelProps = {
  goals: { type: AssetKey; count: number }[];
  level: number;
};

const ITEM_X_OFFSETS = [-0.35, -0.185, 0.185, 0.35];

export class CGoalPanel extends CContainer<
  {
    background: Sprite;
    hud: Container;
    levelText: Text;
  } & { [itemKey: string]: Container }
> {
  private hud!: CGoalHud;
  private items: CGoalItem[] = [];

  constructor(props: TGoalPanelProps) {
    super();

    this.createBackground();
    this.createGoalItems(props.goals);
    this.createHud();
    this.createLevelText(props.level);
  }

  updateMoves(value: number) {
    this.hud.updateMoveCounter(value);
  }

  updateGoal(index: number, remaining: number) {
    this.items[index]?.updateGoalCount(remaining);
  }

  setGoalComplete(index: number, complete: boolean) {
    this.items[index]?.setComplete(complete);
  }

  private createBackground() {
    const texture = getAsset<Texture>("bars/plank_bar");
    const background = new Sprite(texture);
    background.anchor.set(0.5);
    background.scale.set(config.width / background.width);
    this.addNamedChild("background", background);
  }

  private createGoalItems(goals: { type: AssetKey; count: number }[]) {
    const background = this.getChildByLabel("background");
    goals.forEach((goal, index) => {
      const item = new CGoalItem({
        goalCount: goal.count,
        goalType: goal.type,
      });
      const scale = background.width / item.container.width;
      item.container.scale.set(scale * 0.15);
      item.container.position.set(
        background.width * ITEM_X_OFFSETS[index],
        -background.height * 0.05,
      );
      this.addNamedChild(`item_${index}`, item.container);
      this.items.push(item);
    });
  }

  private createHud() {
    const background = this.getChildByLabel("background");
    const hud = new CGoalHud();
    const scale = background.height / hud.container.height;
    hud.container.scale.set(scale * 0.55);
    hud.container.position.set(0, -background.height * 0.075);
    this.addNamedChild("hud", hud.container);
    this.hud = hud;
  }

  private createLevelText(level: number) {
    const background = this.getChildByLabel("background");
    const font = getAsset<FontFace>("Baloo2-Bold");
    const text = new Text({
      text: `~${level}~`,
      style: {
        fontFamily: font.family,
        fontWeight: "bold",
        fontSize: 40,
        fill: COLOR_FONT_FILL_BROWN,
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.position.set(0, background.height * 0.255);
    this.addNamedChild("levelText", text);
  }
}
