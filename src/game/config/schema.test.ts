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

describe("layered cells", () => {
  const withCell = (cell: TLevelInput["data"][number]) =>
    accepts({ data: [cell, ...cells(8)], columns: 3 });

  it("accepts a flower under covers, and defaults a cover to one hit", () => {
    const parsed = configSchema.parse(
      withLevel({
        data: [
          { piece: "apple_half/happy", layers: [{ kind: "VINE" }] },
          ...cells(8),
        ],
        columns: 3,
      }),
    );

    expect(parsed.levels[0].data[0].layers).toEqual([
      { kind: "VINE", hits: 1 },
    ]);
  });

  it("accepts a cell that authors neither, which is every level shipped before now", () => {
    const parsed = configSchema.parse(withLevel({}));
    expect(parsed.levels[0].data[0].layers).toEqual([]);
  });

  it("rejects a hole that tries to hold covers or a flower", () => {
    expect(withCell({ type: "EMPTY", layers: [{ kind: "VINE" }] })).toBe(false);
    expect(withCell({ type: "EMPTY", piece: "apple_half/happy" })).toBe(false);
  });

  it("rejects a flower that is not in the level's piece pool", () => {
    expect(withCell({ piece: "carrot/happy" })).toBe(false);
  });

  it("rejects an unknown cover kind and a zero-hit one", () => {
    expect(
      withCell({
        layers: [{ kind: "BRAMBLE" } as unknown as { kind: "VINE" }],
      }),
    ).toBe(false);
    expect(withCell({ layers: [{ kind: "VINE", hits: 0 }] })).toBe(false);
  });
});

describe("the shipped config", () => {
  it("describes levels whose cells fill whole rows", () => {
    for (const level of shippedConfig.levels) {
      expect(level.data.length % level.columns).toBe(0);
    }
  });
});
