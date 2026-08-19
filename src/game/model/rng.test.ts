import { describe, expect, it } from "vitest";
import { nextFloat, nextFrom, nextInt, randomSeed } from "./rng";

const draws = <T>(
  count: number,
  draw: (source: { rng: number }) => T,
  seed = 1,
): T[] => {
  const source = { rng: seed };
  return Array.from({ length: count }, () => draw(source));
};

describe("nextInt", () => {
  it("reaches both ends of the range and never leaves it", () => {
    const values = draws(500, (source) => nextInt(source, 1, 3));

    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(3);
    expect(values.every(Number.isInteger)).toBe(true);
  });

  it("collapses to the one value when the range is a point", () => {
    expect(draws(50, (source) => nextInt(source, 7, 7))).toEqual(
      Array.from({ length: 50 }, () => 7),
    );
  });
});

describe("nextFrom", () => {
  it("only ever returns a member of the pool", () => {
    const pool = ["a", "b", "c", "d"] as const;
    const picked = draws(500, (source) => nextFrom(source, pool));

    expect(picked.every((value) => pool.includes(value))).toBe(true);
    expect(new Set(picked).size).toBe(pool.length);
  });
});

describe("the cursor", () => {
  it("replays the same sequence from the same seed", () => {
    expect(draws(20, nextFloat, 4242)).toEqual(draws(20, nextFloat, 4242));
  });

  it("diverges on a neighbouring seed", () => {
    expect(draws(20, nextFloat, 4242)).not.toEqual(draws(20, nextFloat, 4243));
  });

  it("stays a signed 32-bit integer, as the save schema requires", () => {
    const source = { rng: randomSeed() };
    for (let draw = 0; draw < 100; draw++) nextFloat(source);

    expect(Number.isInteger(source.rng)).toBe(true);
    expect(source.rng).toBeGreaterThanOrEqual(-(2 ** 31));
    expect(source.rng).toBeLessThan(2 ** 31);
  });
});
