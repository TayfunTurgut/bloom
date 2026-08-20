import { describe, expect, it } from "vitest";
import { nextLesson, type TLessonMoment } from "./lessons";
import { cellIdFromXY } from "../id";
import type { TEffect, TMoveReport } from "../model/types";

const report = (...effects: TEffect[]): TMoveReport => ({ moves: 1, effects });

const sprouted: TEffect = {
  type: "SPROUTED",
  cell: cellIdFromXY(0, 0),
  pieceId: 1,
  value: 5,
};

const fed: TEffect = {
  type: "FED",
  from: cellIdFromXY(1, 0),
  to: cellIdFromXY(0, 0),
  supplyId: 2,
  targetId: 1,
  assetKey: "carrot_happy",
  amount: 3,
  remaining: 2,
};

const levelStart = (level: number): TLessonMoment => ({
  kind: "level-start",
  level,
});

const moveEnd = (level: number, moveReport: TMoveReport): TLessonMoment => ({
  kind: "move-end",
  level,
  report: moveReport,
});

describe("nextLesson", () => {
  it("shows welcome at the start of level 0 only", () => {
    expect(nextLesson(levelStart(0), [])?.id).toBe("welcome");
    expect(nextLesson(levelStart(2), [])).toBeNull();
  });

  it("shows goals at the start of level 1", () => {
    expect(nextLesson(levelStart(1), [])?.id).toBe("goals");
  });

  it("shows feed after a sprouting move on level 0 only", () => {
    expect(nextLesson(moveEnd(0, report(sprouted)), [])?.id).toBe("feed");
    expect(nextLesson(moveEnd(1, report(sprouted)), [])).toBeNull();
  });

  it("shows swap after a feeding move on any level", () => {
    expect(nextLesson(moveEnd(0, report(fed)), [])?.id).toBe("swap");
    expect(nextLesson(moveEnd(3, report(fed)), [])?.id).toBe("swap");
  });

  it("skips lessons already seen", () => {
    expect(nextLesson(levelStart(0), ["welcome"])).toBeNull();
    expect(nextLesson(moveEnd(0, report(fed)), ["swap"])).toBeNull();
  });

  it("returns the first matching lesson only", () => {
    expect(nextLesson(moveEnd(0, report(sprouted, fed)), [])?.id).toBe("feed");
    expect(nextLesson(moveEnd(0, report(sprouted, fed)), ["feed"])?.id).toBe(
      "swap",
    );
  });

  it("does not match moves without the trigger effect", () => {
    const placed: TEffect = {
      type: "PIECE_PLACED",
      cell: cellIdFromXY(0, 0),
      pieceId: 1,
    };
    expect(nextLesson(moveEnd(0, report(placed)), ["feed"])).toBeNull();
  });
});
