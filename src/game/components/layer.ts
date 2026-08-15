import { Sprite, Texture } from "pixi.js";
import { CContainer } from "../../engine/container";
import { getAsset } from "../assets";
import { CCELL_HEIGHT, CCELL_WIDTH } from "./cell";
import type { AssetKey } from "../../assetpack/assets";
import type { TBlockerKind, TBlockerLayer } from "../model/types";

/**
 * How one kind of cover looks. Everything visual about a blocker lives in its
 * entry and nowhere else, the same way everything about its rules lives in its
 * LAYER_BEHAVIORS entry — adding a kind means adding to two tables, and
 * TypeScript names both until you have.
 */
export type TLayerVisual = {
  /** Stages from most intact to most worn. The view picks by remaining hits,
   *  so a 3-hit vine visibly thins as it is chipped away and a 1-hit one just
   *  uses the last stage. */
  readonly stages: readonly AssetKey[];
  /** Art for one particle of the burst played when this kind clears — see
   *  fx.ts. Drawn at roughly a third of a cell, so it wants a bright, simple
   *  shape: the dimmer decor art reads as a smudge at that size. */
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

/** Every texture the layer views can ask for, for the controller's preload.
 *  A key missing from that load resolves to a blank texture at draw time, so
 *  this is derived rather than repeated by hand. */
export const LAYER_ASSET_KEYS: readonly AssetKey[] = Object.values(
  LAYER_VISUALS,
).flatMap((visual) => [...visual.stages, visual.particle]);

/**
 * Draws one cover. Owns no game data: the layer it was built from lives in the
 * store, and `sync` re-reads it. Only the stage can change under a cover
 * already on screen — a cover that clears is destroyed, and a REPLACE outcome
 * mints a new id so it arrives as a new view rather than a mutated one.
 */
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
    // Covers fill the cell rather than fitting inside it like a flower does:
    // the point of a blocker is that it hides what is under it.
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

/**
 * Which stage of art a cover is showing. Full hits picks the last (most
 * intact) stage and one hit picks the first, so a kind reads the same whether
 * a level authored it with one hit or five. Clamped because a cover is drawn
 * from state that has already been damaged, and hits can sit at zero for the
 * span of one call before the pipeline pops it.
 */
const stageOf = (layer: TBlockerLayer): number => {
  const stages = LAYER_VISUALS[layer.kind].stages.length;
  const ratio = layer.hits / Math.max(1, layer.maxHits);
  return Math.min(stages - 1, Math.max(0, Math.ceil(ratio * stages) - 1));
};
