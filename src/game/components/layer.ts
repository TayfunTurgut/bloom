import { Sprite, Texture } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import type { AssetKey } from "../../assetpack/assets";
import type { TBlockerKind, TBlockerLayer } from "../model/types";

export type TLayerVisual = {
  readonly stages: readonly AssetKey[];
  readonly particle: AssetKey;
  readonly tint?: number;
};

export const LAYER_VISUALS: Record<TBlockerKind, TLayerVisual> = {
  VINE: {
    stages: [
      "decor/leaf_cluster_3",
      "decor/leaf_cluster_2",
      "decor/leaf_cluster",
    ],
    particle: "decor/leaf_particles",
  },
  STONE: {
    stages: ["tiles/stone_3", "tiles/stone_2", "tiles/stone"],
    particle: "tiles/stone_3",
  },
};

export const LAYER_ASSET_KEYS: readonly AssetKey[] = Object.values(
  LAYER_VISUALS,
).flatMap((visual) => [...visual.stages, visual.particle]);

export class CLayer extends CContainer<{ sprite: Sprite }> {
  readonly id: number;
  private stage: number;

  constructor(layer: TBlockerLayer) {
    super();

    this.id = layer.id;
    this.stage = stageOf(layer);

    const visual = LAYER_VISUALS[layer.kind];
    const sprite = new Sprite(getAsset<Texture>(visual.stages[this.stage]));
    sprite.anchor.set(0.5);
    sprite.setSize(CCELL_WIDTH, CCELL_HEIGHT);
    if (visual.tint !== undefined) sprite.tint = visual.tint;
    this.addNamedChild("sprite", sprite);
  }

  sync(layer: TBlockerLayer) {
    const stage = stageOf(layer);
    if (stage === this.stage) return;
    this.stage = stage;
    this.getChildByLabel("sprite").texture = getAsset<Texture>(
      LAYER_VISUALS[layer.kind].stages[stage],
    );
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}

const stageOf = (layer: TBlockerLayer): number => {
  const stages = LAYER_VISUALS[layer.kind].stages.length;
  const ratio = layer.hits / Math.max(1, layer.maxHits);
  return Math.min(stages - 1, Math.max(0, Math.ceil(ratio * stages) - 1));
};
