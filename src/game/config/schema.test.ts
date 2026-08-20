import { describe, expect, it } from "vitest";
import { configSchema, type TConfigInput, type TLevelInput } from "./schema";

const cells = (count: number) => Array.from({ length: count }, () => ({}));

const withLevel = (level: Partial<TLevelInput>): TConfigInput => ({
  levels: [
    {
      data: cells(9),
      columns: 3,
      goals: [{ type: "apple_happy", count: 1 }],
      pieces: ["apple_happy"],
      ...level,
    },
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

describe("authored cells", () => {
  const withCell = (cell: TLevelInput["data"][number]) =>
    accepts({ data: [cell, ...cells(8)], columns: 3 });

  it("accepts a flower with an authored starting value", () => {
    expect(withCell({ piece: "apple_happy", value: 12 })).toBe(true);
  });

  it("rejects a value outside the 1-12 range", () => {
    expect(withCell({ piece: "apple_happy", value: 0 })).toBe(false);
    expect(withCell({ piece: "apple_happy", value: 13 })).toBe(false);
  });

  it("rejects a value with no piece to carry it", () => {
    expect(withCell({ value: 6 })).toBe(false);
  });

  it("rejects a hole that tries to hold a flower or a value", () => {
    expect(withCell({ type: "EMPTY", piece: "apple_happy" })).toBe(false);
    expect(withCell({ type: "EMPTY", value: 6 })).toBe(false);
  });

  it("rejects a flower that is not in the level's piece pool", () => {
    expect(withCell({ piece: "carrot_happy" })).toBe(false);
  });
});

describe("goals", () => {
  it("rejects a goal type that is not in the level's piece pool", () => {
    expect(accepts({ goals: [{ type: "carrot_happy", count: 1 }] })).toBe(
      false,
    );
  });

  it("rejects a level without goals, and one with more than four", () => {
    expect(accepts({ goals: [] })).toBe(false);
    expect(
      accepts({
        goals: Array.from({ length: 5 }, () => ({
          type: "apple_happy" as const,
          count: 1,
        })),
      }),
    ).toBe(false);
  });
});
