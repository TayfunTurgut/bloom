import { describe, expect, it } from "vitest";
import { fitDesignBox, ZERO_INSETS } from "./fit";

const DESIGN = { width: 720, height: 1280 };

describe("fitDesignBox", () => {
  it("contain-fits and centers when there are no insets", () => {
    const fit = fitDesignBox(
      720,
      1400,
      ZERO_INSETS,
      DESIGN.width,
      DESIGN.height,
    );

    expect(fit.scale).toBe(1);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe(60);
  });

  it("scales down to the narrow side", () => {
    const fit = fitDesignBox(
      360,
      1400,
      ZERO_INSETS,
      DESIGN.width,
      DESIGN.height,
    );

    expect(fit.scale).toBe(0.5);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe((1400 - 640) / 2);
  });

  it("pushes the box below a top inset and above a bottom one", () => {
    const insets = { top: 60, right: 0, bottom: 40, left: 0 };
    const fit = fitDesignBox(720, 1400, insets, DESIGN.width, DESIGN.height);

    expect(fit.scale).toBe(1);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe(60 + (1300 - 1280) / 2);
  });

  it("shrinks into the inset-reduced box when insets pinch it", () => {
    const insets = { top: 100, right: 0, bottom: 100, left: 0 };
    const fit = fitDesignBox(720, 1380, insets, DESIGN.width, DESIGN.height);

    expect(fit.scale).toBeCloseTo(1180 / 1280);
    expect(fit.y).toBe(100);
    expect(fit.x).toBeCloseTo((720 - 720 * (1180 / 1280)) / 2);
  });

  it("respects side insets in landscape", () => {
    const insets = { top: 0, right: 59, bottom: 21, left: 59 };
    const fit = fitDesignBox(1400, 720, insets, DESIGN.width, DESIGN.height);

    const scale = 699 / 1280;
    expect(fit.scale).toBeCloseTo(scale);
    expect(fit.x).toBeCloseTo(59 + (1282 - 720 * scale) / 2);
    expect(fit.y).toBe(0);
  });

  it("never divides by zero on a degenerate window", () => {
    const insets = { top: 500, right: 0, bottom: 500, left: 0 };
    const fit = fitDesignBox(0, 100, insets, DESIGN.width, DESIGN.height);

    expect(fit.scale).toBeGreaterThan(0);
    expect(Number.isFinite(fit.x)).toBe(true);
    expect(Number.isFinite(fit.y)).toBe(true);
  });
});
