import { pixiPipes } from "@assetpack/core/pixi";
import { types } from "./src/assetpack/types.js";

const pipes = pixiPipes({
  cacheBust: true,
  audio: {
    // Recompress even same-format inputs so the raw music file shrinks.
    outputs: [
      {
        formats: [".mp3"],
        recompress: true,
        options: { audioBitrate: 96, audioChannels: 1, audioFrequency: 48000 },
      },
      {
        formats: [".ogg"],
        recompress: true,
        options: { audioBitrate: 32, audioChannels: 1, audioFrequency: 22050 },
      },
    ],
  },
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
