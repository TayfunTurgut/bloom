import { describe, expect, it } from "vitest";
import { advanceProgress, ENDLESS_START, TOTAL_LEVELS } from "./progression";

describe("advanceProgress", () => {
  it("walks the linear ladder one level at a time", () => {
    expect(advanceProgress(0, null)).toEqual({
      index: 1,
      endless: null,
      awardBonus: false,
    });
    expect(advanceProgress(500, null).index).toBe(501);
  });

  it("enters endless with a bonus after the final linear level", () => {
    const result = advanceProgress(TOTAL_LEVELS - 1, null, 123);
    expect(result.awardBonus).toBe(true);
    expect(result.endless).not.toBeNull();
    expect(result.endless!.pos).toBe(1);
    expect(result.index).toBe(result.endless!.order[0]);
  });

  it("shuffles only the pool past the easy levels", () => {
    const order = advanceProgress(TOTAL_LEVELS - 1, null, 123).endless!.order;
    expect(order).toHaveLength(TOTAL_LEVELS - ENDLESS_START);
    expect(Math.min(...order)).toBe(ENDLESS_START);
    expect(Math.max(...order)).toBe(TOTAL_LEVELS - 1);
    expect(new Set(order).size).toBe(order.length);
  });

  it("serves the stored order, then reshuffles with a bonus when exhausted", () => {
    const order = [10, 11, 12];
    expect(advanceProgress(11, { order, pos: 1 })).toEqual({
      index: 11,
      endless: { order, pos: 2 },
      awardBonus: false,
    });
    const wrapped = advanceProgress(12, { order, pos: 3 }, 5);
    expect(wrapped.awardBonus).toBe(true);
    expect(wrapped.endless!.pos).toBe(1);
    expect(wrapped.endless!.order).toHaveLength(TOTAL_LEVELS - ENDLESS_START);
  });
});
