import { describe, expect, it } from "vitest";
import { configSchema, type TConfigInput } from "./schema";
import shippedConfig from "./index";

type TLevelInput = TConfigInput["levels"][number];

const cells = (count: number) => Array.from({ length: count }, () => ({}));

const withLevel = (level: Partial<TLevelInput>): TConfigInput => ({
  levels: [
    { data: cells(9), columns: 3, pieces: ["apple_half/happy"], ...level },
  ],
});

const accepts = (level: Partial<TLevelInput>) =>
  configSchema.safeParse(withLevel(level)).success;

describe("levelSchema", () => {
  // The board's row count is derived as data.length / columns, so a level whose
  // cells don't fill whole rows yields a fractional `rows`. The board is then
  // built with more cells than the level declares, and every snapshot of it
  // fails fromSnapshot's `board.length !== rows * columns` check — the game
  // looks playable but silently discards the save on every reload.
  it("rejects a cell count that does not divide into whole rows", () => {
    expect(accepts({ data: cells(12), columns: 5 })).toBe(false);
  });

  it("rejects a fractional column count", () => {
    expect(accepts({ data: cells(9), columns: 2.5 })).toBe(false);
  });

  it("rejects a level with no cells", () => {
    expect(accepts({ data: [], columns: 3 })).toBe(false);
  });

  it("accepts holes, which still occupy their slot in the grid", () => {
    expect(
      accepts({
        data: [{}, { type: "EMPTY" }, {}, {}, {}, {}, {}, {}, {}],
        columns: 3,
      }),
    ).toBe(true);
  });
});

describe("the shipped config", () => {
  // config/index.ts parses at import, so a level edit that breaks the schema
  // fails here rather than at app startup.
  it("describes levels whose cells fill whole rows", () => {
    for (const level of shippedConfig.levels) {
      expect(level.data.length % level.columns).toBe(0);
    }
  });
});
