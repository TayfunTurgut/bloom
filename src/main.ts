import "./style.css";
import { createEngine } from "./engine/app";
import { CGameController } from "./game/controller";
import { COLOR_BACKGROUND } from "./game/colors";
import type { AssetKey } from "./assetpack/assets";

async function main() {
  const mount = document.getElementById("pixi-container");
  if (!mount) {
    throw new Error("#pixi-container not found");
  }

  const engine = await createEngine<AssetKey>({
    mount,
    manifestUrl: "assets/manifest.json",
    appOptions: { background: COLOR_BACKGROUND },
  });

  await new CGameController(engine).start();
}

void main();
