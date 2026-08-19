import { pixiPipes } from "@assetpack/core/pixi";
import { types } from "./src/assetpack/types.js";

const pipes = pixiPipes({
  cacheBust: true,
  texturePacker: {
    texturePacker: {
      removeFileExtension: true,
    },
  },
  manifest: {
    trimExtensions: true,
  },
  resolutions: {
    default: 1,
  },
});

export default {
  entry: "./src/assets",
  output: "./public/assets",
  pipes: [...pipes, types()],
  cache: true,
};
