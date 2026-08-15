import { pixiPipes } from "@assetpack/core/pixi";
import { atlas } from "./src/assetpack/atlas.js";
import { spriteSheet } from "./src/assetpack/spriteSheet.js";
import { types } from "./src/assetpack/types.js";

const pipes = pixiPipes({
  manifest: {
    trimExtensions: true,
  },
  resolutions: {
    default: 1,
  },
});

const mipmapIndex = pipes.findIndex((pipe) => pipe.name === "mipmap");
if (mipmapIndex === -1) {
  throw new Error("assetpack: the mipmap pipe is required by sprite-sheet");
}
pipes.splice(mipmapIndex + 1, 0, spriteSheet(), atlas());

export default {
  entry: "./src/assets",
  output: "./public/assets",
  pipes: [...pipes, types()],
};
