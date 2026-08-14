import { checkExt } from "@assetpack/core";

/**
 * Tags pre-packed TexturePacker atlases so the texture-packer pipes treat them as their own output.
 *
 * The `ui/` and `pieces/` folders hold atlases exported straight from TexturePacker — `frames` plus a
 * `meta.image`, and `related_multi_packs` for the multi-page sheets — rather than loose sprites for the
 * `texture-packer` pipe to pack. Nothing tags them `{tps}`, so the whole texture-packer suite skips them:
 * `cacheBuster` still hashes every `.png`/`.json`, but `texturePackerCacheBuster` never rewrites the atlas
 * bodies, leaving `meta.image` (and each `related_multi_packs` entry) pointing at names that no longer exist.
 *
 * Marking each atlas json `tps` opts it into that suite — `texturePackerCompress` for the per-format json
 * variants, `texturePackerCacheBuster` for the hashed `meta.image`, and `texturePackerManifestMod` for the
 * manifest entry — exactly as the `sprite-sheet` pipe does for the sheets it emits. Must be registered
 * *before* those pipes.
 *
 * The `ui`/`pieces` sheets were exported from TexturePacker as multi-page sets, so each carries a
 * `related_multi_packs` list of its siblings. Pixi auto-loads those siblings by joining their names to the
 * sheet's directory, but `texturePackerCacheBuster` can't cache-bust them: rewriting one page changes its
 * content, hence its hash, hence its filename — so every sibling that already referenced the old name is
 * left dangling (a single pass can't converge on mutually-referencing files). We don't need the feature —
 * `game.ts` loads every page through the manifest bundle and the UI reads one page's animations at a time —
 * so we empty the list, matching what the `sprite-sheet` pipe already emits. Keep it an (empty) array:
 * `texturePackerCompress` drops sheets whose `related_multi_packs` is falsy from the manifest.
 *
 * @returns {import("@assetpack/core").AssetPipe}
 */
export function atlas() {
  return {
    folder: false,
    name: "atlas",
    defaultOptions: {},
    tags: {
      tps: "tps",
    },
    test: (asset) => !asset.isFolder && checkExt(asset.path, ".json"),
    transform: async (asset) => {
      let json;
      try {
        json = JSON.parse(asset.buffer.toString());
      } catch {
        return [asset];
      }

      if (json?.frames && json.meta?.image) {
        asset.metaData.tps = true;
        asset.metaData.frameNames = Object.keys(json.frames);
        if (json.meta.related_multi_packs?.length) {
          json.meta.related_multi_packs = [];
          asset.buffer = Buffer.from(JSON.stringify(json));
        }
      }

      return [asset];
    },
  };
}
