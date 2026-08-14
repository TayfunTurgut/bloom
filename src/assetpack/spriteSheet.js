import {
  BuildReporter,
  checkExt,
  createNewAssetAt,
  stripTags,
  swapExt,
} from "@assetpack/core";

function pngSize(buffer) {
  return { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) };
}

function resolutionOf(filename) {
  const match = filename.match(/@([\d.]+)x/);
  return match ? parseFloat(match[1]) : 1;
}

function count(value, tag, asset) {
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `assetpack sprite-sheet: "${asset.filename}" has {${tag}=${value}} — expected a positive integer`,
    );
  }
  return value;
}

/**
 * Slices a grid sprite sheet into a Pixi spritesheet json, one per image variant.
 *
 * Tag a png `{ss}` and give it a grid — `{r=2}{c=4}`, both defaulting to 1 — and every frame becomes
 * `<name>/<index>` in row-major order, with an animation named after the sheet holding all of them.
 *
 * Must be registered *between* `mipmap` and `compress`: it needs one png per resolution to read real
 * pixel sizes from, and leaves the format fan-out to `compress` + `texture-packer-compress`.
 *
 * The emitted assets deliberately match what the `texture-packer` pipe produces — an `mIgnore`d texture
 * plus a `tps` json — so the texture packer's compress, cache-buster and manifest pipes pick our sheets
 * up and handle format cloning, hashed `meta.image` paths and file sizes for us.
 *
 * @returns {import("@assetpack/core").AssetPipe}
 */
export function spriteSheet() {
  return {
    folder: false,
    name: "sprite-sheet",
    defaultOptions: {},
    tags: {
      ss: "ss",
      rows: "r",
      columns: "c",
    },
    test: (asset) => !asset.isFolder && !!asset.allMetaData.ss,
    transform: async (asset) => {
      if (!checkExt(asset.path, ".png")) {
        throw new Error(
          `assetpack sprite-sheet: "${asset.filename}" is tagged {ss} but is not a png`,
        );
      }

      const rows = count(asset.allMetaData.r, "r", asset);
      const columns = count(asset.allMetaData.c, "c", asset);

      const { w, h } = pngSize(asset.buffer);
      const frameWidth = Math.floor(w / columns);
      const frameHeight = Math.floor(h / rows);

      if (w % columns !== 0 || h % rows !== 0) {
        BuildReporter.warn(
          `[AssetPack][sprite-sheet] "${asset.filename}" is ${w}x${h}, which does not divide evenly ` +
            `into {r=${rows}}{c=${columns}} — using ${frameWidth}x${frameHeight} frames and leaving ` +
            `${w % columns}x${h % rows} pixels unused`,
        );
      }

      const textureName = stripTags(asset.filename);
      const name = swapExt(stripTags(asset.rootTransformAsset.filename), "");

      const frames = {};
      const frameNames = [];

      for (let i = 0; i < rows * columns; i++) {
        const frameName = `${name}/${i}`;
        frameNames.push(frameName);
        frames[frameName] = {
          frame: {
            x: (i % columns) * frameWidth,
            y: Math.floor(i / columns) * frameHeight,
            w: frameWidth,
            h: frameHeight,
          },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
          sourceSize: { w: frameWidth, h: frameHeight },
        };
      }

      const json = {
        frames,
        animations: { [name]: frameNames },
        meta: {
          app: "https://github.com/pixijs/assetpack",
          version: "1.0",
          image: textureName,
          format: "RGBA8888",
          size: { w, h },
          scale: resolutionOf(asset.filename),
          related_multi_packs: [],
        },
      };

      const textureAsset = createNewAssetAt(asset, textureName);
      textureAsset.buffer = asset.buffer;
      textureAsset.metaData.mIgnore = true;

      const jsonAsset = createNewAssetAt(asset, swapExt(textureName, ".json"));
      jsonAsset.buffer = Buffer.from(JSON.stringify(json, null, 2));
      jsonAsset.metaData.tps = true;

      asset.rootTransformAsset.metaData.frameNames = frameNames;

      return [textureAsset, jsonAsset];
    },
  };
}
