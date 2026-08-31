import "./style.css";
import { createEngine } from "./engine/app";
import { initPlatform, notifySceneReady } from "./engine/platform/capacitor";
import { CGameController } from "./game/controller";
import { COLOR_BACKGROUND } from "./game/colors";
import { resumeAudio, suspendAudio } from "./game/sound";
import type { AssetKey } from "./assetpack/assets";

async function main() {
  const mount = document.getElementById("pixi-container");
  if (!mount) {
    throw new Error("#pixi-container not found");
  }

  const engine = await createEngine<AssetKey>({
    mount,
    basePath: "assets/",
    manifestUrl: "manifest.json",
    appOptions: { background: COLOR_BACKGROUND },
  });
  await initPlatform(engine.app, {
    onPause: suspendAudio,
    onResume: resumeAudio,
  });

  await new CGameController(engine).start();

  await notifySceneReady();
}

void main();
