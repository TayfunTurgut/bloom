import { describe, expect, it } from "vitest";
import {
  createInitialState,
  goalRemaining,
  isGoalComplete,
  milestoneThresholds,
  placeFromTray,
  scoreMax,
  swapTray,
  TRAY_SIZE,
  type TLevel,
} from "./rules";
import { cellIdFromXY } from "../id";
import type { TGameState, TPiece } from "./types";

const APPLE = "apple_happy";
const CARROT = "carrot_happy";

const cell = (over: Partial<TLevel["data"][number]> = {}) => ({
  type: "FILLED" as const,
  ...over,
});

const level: TLevel = {
  data: Array.from({ length: 9 }, () => cell()),
  columns: 3,
  goals: [{ type: APPLE, count: 2 }],
  pieces: [APPLE, CARROT],
};

const holedLevel: TLevel = {
  ...level,
  data: level.data.map((entry, index) =>
    index === 4 ? cell({ type: "EMPTY" }) : entry,
  ),
};

const rowLevel: TLevel = {
  data: Array.from({ length: 3 }, () => cell()),
  columns: 3,
  goals: [{ type: APPLE, count: 1 }],
  pieces: [APPLE, CARROT],
};

const SEED = 12345;

const stack = (state: TGameState, ...pieces: Partial<TPiece>[]) => {
  state.tray = pieces.map((piece, index) => ({
    id: 1000 + index,
    assetKey: APPLE,
    type: "SEED",
    startingValue: piece.currentValue ?? 5,
    currentValue: 5,
    ...piece,
  }));
};

const at = (state: TGameState, x: number, y: number) =>
  state.board.get(cellIdFromXY(x, y))?.piece ?? null;

describe("createInitialState", () => {
  it("opens with an empty board, a full tray and zeroed goals", () => {
    const state = createInitialState(0, level, SEED);

    expect(state.board.size).toBe(9);
    expect([...state.board.values()].every((cell) => cell.piece === null)).toBe(
      true,
    );
    expect(state.tray).toHaveLength(TRAY_SIZE);
    expect(state.tray.every((piece) => piece.type === "SEED")).toBe(true);
    expect(state.goals).toEqual([{ type: APPLE, target: 2, progress: 0 }]);
    expect(state.moves).toBe(0);
    expect(state.score).toBe(0);
  });

  it("draws the same tray twice from the same seed", () => {
    const a = createInitialState(0, level, SEED);
    const b = createInitialState(0, level, SEED);

    expect(a.tray.map((piece) => piece.assetKey)).toEqual(
      b.tray.map((piece) => piece.assetKey),
    );
    expect(a.tray.map((piece) => piece.currentValue)).toEqual(
      b.tray.map((piece) => piece.currentValue),
    );
  });

  it("only ever draws pieces from the level's pool", () => {
    const state = createInitialState(0, level, SEED);
    for (let move = 0; move < 9; move++) {
      placeFromTray(state, move % 3, Math.floor(move / 3));
    }

    const drawn = [
      ...[...state.board.values()].map((cell) => cell.piece),
      ...state.tray,
    ].filter((piece): piece is TPiece => piece != null);
    expect(drawn.every((piece) => level.pieces.includes(piece.assetKey))).toBe(
      true,
    );
  });

  it("starts an authored crop growing with its authored value", () => {
    const authored: TLevel = {
      ...level,
      data: level.data.map((entry, index) =>
        index === 4 ? cell({ piece: CARROT, value: 6 }) : entry,
      ),
    };
    const state = createInitialState(0, authored, SEED);

    const piece = at(state, 1, 1);
    expect(piece?.type).toBe("GROWING");
    expect(piece?.assetKey).toBe(CARROT);
    expect(piece?.currentValue).toBe(6);
    expect(piece?.startingValue).toBe(6);
  });

  it("rolls a seeded value for an authored crop without one", () => {
    const authored: TLevel = {
      ...level,
      data: level.data.map((entry, index) =>
        index === 4 ? cell({ piece: CARROT }) : entry,
      ),
    };
    const a = createInitialState(0, authored, SEED);
    const b = createInitialState(0, authored, SEED);

    const piece = at(a, 1, 1);
    expect(piece?.currentValue).toBeGreaterThanOrEqual(1);
    expect(piece?.currentValue).toBeLessThanOrEqual(12);
    expect(piece?.currentValue).toBe(at(b, 1, 1)?.currentValue);
  });
});

describe("placeFromTray", () => {
  it("moves the rightmost tray piece onto the cell and refills behind it", () => {
    const state = createInitialState(0, level, SEED);
    const front = state.tray[state.tray.length - 1];

    expect(placeFromTray(state, 1, 1)).not.toBeNull();
    expect(at(state, 1, 1)).toBe(front);
    expect(state.moves).toBe(1);
    expect(state.tray).toHaveLength(TRAY_SIZE);
    expect(state.tray).not.toContain(front);
  });

  it("sprouts an isolated crop and reports it", () => {
    const state = createInitialState(0, level, SEED);
    stack(state, { currentValue: 5 });

    const report = placeFromTray(state, 0, 0);

    expect(at(state, 0, 0)?.type).toBe("GROWING");
    expect(at(state, 0, 0)?.currentValue).toBe(5);
    expect(report?.effects).toContainEqual({
      type: "SPROUTED",
      cell: cellIdFromXY(0, 0),
      pieceId: 1000,
      value: 5,
    });
  });

  it("turns a crop with growing neighbours into supply and feeds the strongest", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 7 });
    placeFromTray(state, 2, 0);
    stack(state, { currentValue: 3 });
    placeFromTray(state, 1, 0);

    expect(at(state, 1, 0)?.type).toBe("SUPPLY");
    expect(at(state, 2, 0)?.currentValue).toBe(4);
    expect(at(state, 0, 0)?.currentValue).toBe(5);
  });

  it("feeds the neighbour on the left when two neighbours tie on value", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 6 });
    placeFromTray(state, 0, 1);
    stack(state, { currentValue: 6 });
    placeFromTray(state, 2, 1);
    stack(state, { currentValue: 2 });
    placeFromTray(state, 1, 1);

    expect(at(state, 0, 1)?.currentValue).toBe(4);
    expect(at(state, 2, 1)?.currentValue).toBe(6);
  });

  it("clamps a feed at zero and harvests the crop with its supplies", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 12 });
    const report = placeFromTray(state, 1, 0);

    expect(at(state, 0, 0)).toBeNull();
    expect(at(state, 1, 0)).toBeNull();
    expect(report?.effects).toContainEqual(
      expect.objectContaining({ type: "FED", amount: 12, remaining: 0 }),
    );
    expect(
      report?.effects.filter((effect) => effect.type === "HARVESTED"),
    ).toEqual([
      expect.objectContaining({ crop: "GROWING", cell: cellIdFromXY(0, 0) }),
      expect.objectContaining({ crop: "SUPPLY", cell: cellIdFromXY(1, 0) }),
    ]);
  });

  it("sprouts a crop whose only neighbours are spent supplies", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 3 });
    placeFromTray(state, 1, 0);
    expect(at(state, 1, 0)?.type).toBe("SUPPLY");

    stack(state, { currentValue: 4 });
    placeFromTray(state, 2, 0);

    expect(at(state, 2, 0)?.type).toBe("GROWING");
    expect(at(state, 1, 0)?.currentValue).toBe(3);
  });

  it("rejects an occupied cell and one off the board, changing nothing", () => {
    const state = createInitialState(0, level, SEED);
    placeFromTray(state, 0, 0);
    const before = [...state.tray];

    expect(placeFromTray(state, 0, 0)).toBeNull();
    expect(placeFromTray(state, 3, 0)).toBeNull();
    expect(placeFromTray(state, -1, 0)).toBeNull();
    expect(state.moves).toBe(1);
    expect(state.tray).toEqual(before);
  });

  it("reports the same effects for the same seed and moves", () => {
    const run = () => {
      const state = createInitialState(0, level, SEED);
      return [
        placeFromTray(state, 1, 1),
        placeFromTray(state, 1, 0),
        placeFromTray(state, 0, 0),
      ];
    };

    expect(run()).toEqual(run());
  });
});

describe("harvesting a crop", () => {
  it("advances a matching goal only on the harvest, never on placement", () => {
    const state = createInitialState(0, level, SEED);
    const goal = state.goals[0];

    stack(state, { assetKey: APPLE, currentValue: 4 });
    placeFromTray(state, 1, 1);
    expect(goal.progress).toBe(0);

    stack(state, { assetKey: CARROT, currentValue: 4 });
    placeFromTray(state, 1, 0);

    expect(at(state, 1, 1)).toBeNull();
    expect(goal.progress).toBe(1);
    expect(goalRemaining(goal)).toBe(1);
    expect(isGoalComplete(goal)).toBe(false);
  });

  it("awards the crop's starting value, capped at the score max", () => {
    const state = createInitialState(0, level, SEED);
    expect(scoreMax(state)).toBe(10);
    expect(milestoneThresholds(state)).toEqual([4, 7, 10]);

    stack(state, { currentValue: 12 });
    placeFromTray(state, 1, 1);
    stack(state, { currentValue: 12 });
    const report = placeFromTray(state, 1, 0);

    expect(state.score).toBe(10);
    expect(report?.effects).toContainEqual({
      type: "SCORED",
      amount: 10,
      total: 10,
    });
    expect(
      report?.effects.filter((effect) => effect.type === "MILESTONE_REACHED"),
    ).toEqual([
      { type: "MILESTONE_REACHED", index: 0 },
      { type: "MILESTONE_REACHED", index: 1 },
      { type: "MILESTONE_REACHED", index: 2 },
    ]);
  });

  it("awards no score for a crop outside the goals", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { assetKey: CARROT, currentValue: 4 });
    placeFromTray(state, 1, 1);
    stack(state, { assetKey: CARROT, currentValue: 4 });
    const report = placeFromTray(state, 1, 0);

    expect(at(state, 1, 1)).toBeNull();
    expect(state.score).toBe(0);
    expect(
      report?.effects.some(
        (effect) =>
          effect.type === "SCORED" || effect.type === "MILESTONE_REACHED",
      ),
    ).toBe(false);
  });

  it("orders a move's effects as placement, feed, then the harvest cluster", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 12 });
    const report = placeFromTray(state, 1, 0);

    expect(report?.effects.map((effect) => effect.type)).toEqual([
      "PIECE_PLACED",
      "FED",
      "HARVESTED",
      "SCORED",
      "MILESTONE_REACHED",
      "HARVESTED",
    ]);
  });

  it("harvests adjacent supplies without goal or score credit", () => {
    const state = createInitialState(0, level, SEED);
    const goal = state.goals[0];

    stack(state, { assetKey: APPLE, currentValue: 4 });
    placeFromTray(state, 1, 1);
    stack(state, { assetKey: APPLE, currentValue: 2 });
    placeFromTray(state, 1, 0);
    stack(state, { assetKey: APPLE, currentValue: 2 });
    placeFromTray(state, 0, 1);

    expect(at(state, 1, 1)).toBeNull();
    expect(at(state, 1, 0)).toBeNull();
    expect(at(state, 0, 1)).toBeNull();
    expect(goal.progress).toBe(1);
    expect(state.score).toBe(4);
  });

  it("never cascades into a second growing crop", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 8 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 3 });
    placeFromTray(state, 2, 0);
    stack(state, { currentValue: 8 });
    placeFromTray(state, 1, 0);

    expect(at(state, 0, 0)).toBeNull();
    expect(at(state, 1, 0)).toBeNull();
    expect(at(state, 2, 0)?.type).toBe("GROWING");
    expect(at(state, 2, 0)?.currentValue).toBe(3);
  });
});

describe("level outcome", () => {
  it("reports LEVEL_WON exactly on the winning move", () => {
    const state = createInitialState(0, rowLevel, SEED);

    stack(state, { assetKey: APPLE, currentValue: 5 });
    placeFromTray(state, 0, 0);
    stack(state, { assetKey: APPLE, currentValue: 5 });
    const winning = placeFromTray(state, 1, 0);

    expect(
      winning?.effects.filter((effect) => effect.type === "LEVEL_WON"),
    ).toEqual([{ type: "LEVEL_WON", milestones: 3 }]);
    expect(
      winning?.effects.some((effect) => effect.type === "LEVEL_FAILED"),
    ).toBe(false);

    stack(state, { assetKey: CARROT, currentValue: 5 });
    const after = placeFromTray(state, 2, 0);
    expect(after?.effects.some((effect) => effect.type === "LEVEL_WON")).toBe(
      false,
    );
  });

  it("fails when the board fills while goals are incomplete", () => {
    const state = createInitialState(0, rowLevel, SEED);

    stack(state, { assetKey: CARROT, currentValue: 12 });
    placeFromTray(state, 0, 0);
    stack(state, { assetKey: CARROT, currentValue: 5 });
    placeFromTray(state, 1, 0);
    stack(state, { assetKey: CARROT, currentValue: 12 });
    const filling = placeFromTray(state, 2, 0);

    expect(at(state, 0, 0)?.currentValue).toBe(7);
    expect(at(state, 2, 0)?.type).toBe("GROWING");
    expect(
      filling?.effects.filter((effect) => effect.type === "LEVEL_FAILED"),
    ).toEqual([{ type: "LEVEL_FAILED" }]);
  });

  it("does not fail when the filling move harvests cells free", () => {
    const state = createInitialState(0, rowLevel, SEED);

    stack(state, { assetKey: APPLE, currentValue: 9 });
    placeFromTray(state, 0, 0);
    stack(state, { assetKey: CARROT, currentValue: 2 });
    placeFromTray(state, 2, 0);
    stack(state, { assetKey: APPLE, currentValue: 9 });
    const report = placeFromTray(state, 1, 0);

    expect(at(state, 0, 0)).toBeNull();
    expect(at(state, 1, 0)).toBeNull();
    expect(report?.effects.some((effect) => effect.type === "LEVEL_WON")).toBe(
      true,
    );
    expect(
      report?.effects.some((effect) => effect.type === "LEVEL_FAILED"),
    ).toBe(false);
  });
});

describe("a level with holes", () => {
  it("keeps a hole off the board without reshaping the grid", () => {
    const state = createInitialState(0, holedLevel, SEED);
    const before = [...state.tray];

    expect(state.rows).toBe(3);
    expect(state.columns).toBe(3);
    expect(state.board.size).toBe(8);
    expect(state.board.has(cellIdFromXY(1, 1))).toBe(false);

    expect(placeFromTray(state, 1, 1)).toBeNull();
    expect(state.moves).toBe(0);
    expect(state.tray).toEqual(before);
  });

  it("does not let crops reach across a hole", () => {
    const state = createInitialState(0, holedLevel, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 1, 0);
    stack(state, { currentValue: 3 });
    placeFromTray(state, 1, 2);

    expect(at(state, 1, 2)?.type).toBe("GROWING");
    expect(at(state, 1, 0)?.currentValue).toBe(5);
  });
});

describe("scripted pieces", () => {
  const scripted = (values: number[]): TLevel => ({
    ...level,
    script: values.map((value) => ({ piece: APPLE, value })),
  });

  it("deals the script into the tray so the first entry is played first", () => {
    const state = createInitialState(0, scripted([6, 2, 4]), SEED);

    expect(state.tray.map((piece) => piece.id)).toEqual([3, 2, 1]);
    expect(state.tray.map((piece) => piece.currentValue)).toEqual([4, 2, 6]);
    expect(state.tray[state.tray.length - 1].currentValue).toBe(6);
    expect(state.scriptIndex).toBe(3);
  });

  it("keeps drawing from the script on refills until it runs out", () => {
    const state = createInitialState(0, scripted([6, 2, 4, 9]), SEED);

    placeFromTray(state, 0, 0);

    expect(state.tray[0].currentValue).toBe(9);
    expect(state.scriptIndex).toBe(4);
  });

  it("hands over to the seeded rng once the script is exhausted", () => {
    const run = () => {
      const state = createInitialState(0, scripted([6, 2, 4]), SEED);
      placeFromTray(state, 0, 0);
      placeFromTray(state, 2, 0);
      return state.tray.map((piece) => [piece.assetKey, piece.currentValue]);
    };

    expect(run()).toEqual(run());
    const state = createInitialState(0, scripted([6, 2, 4]), SEED);
    placeFromTray(state, 0, 0);
    expect(
      state.tray.every((piece) => level.pieces.includes(piece.assetKey)),
    ).toBe(true);
  });

  it("never lets a preplaced piece consume a script entry", () => {
    const authored: TLevel = {
      ...scripted([6, 2, 4]),
      data: level.data.map((entry, index) =>
        index === 4 ? cell({ piece: CARROT, value: 5 }) : entry,
      ),
    };
    const state = createInitialState(0, authored, SEED);

    expect(at(state, 1, 1)?.id).toBe(1);
    expect(at(state, 1, 1)?.currentValue).toBe(5);
    expect(state.tray.map((piece) => piece.currentValue)).toEqual([4, 2, 6]);
    expect(state.scriptIndex).toBe(3);
  });
});

describe("rocked pieces", () => {
  const rocked = (over: Partial<TLevel["data"][number]> = {}): TLevel => ({
    ...level,
    data: level.data.map((entry, index) =>
      index === 4
        ? cell({ piece: CARROT, value: 6, rocked: true, ...over })
        : entry,
    ),
  });

  it("starts an authored rocked crop growing with its rock in place", () => {
    const state = createInitialState(0, rocked(), SEED);

    const piece = at(state, 1, 1);
    expect(piece?.type).toBe("GROWING");
    expect(piece?.rocked).toBe(true);
    expect(piece?.currentValue).toBe(6);
  });

  it("sprouts a crop whose only growing neighbour is rocked", () => {
    const state = createInitialState(0, rocked(), SEED);

    stack(state, { currentValue: 3 });
    const report = placeFromTray(state, 1, 0);

    expect(at(state, 1, 0)?.type).toBe("GROWING");
    expect(report?.effects.some((effect) => effect.type === "FED")).toBe(false);
    expect(at(state, 1, 1)?.currentValue).toBe(6);
  });

  it("feeds a weaker normal neighbour over a stronger rocked one", () => {
    const state = createInitialState(0, rocked({ value: 9 }), SEED);

    stack(state, { currentValue: 3 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 2 });
    placeFromTray(state, 0, 1);

    expect(at(state, 0, 0)?.currentValue).toBe(1);
    expect(at(state, 1, 1)?.currentValue).toBe(9);
    expect(at(state, 1, 1)?.rocked).toBe(true);
  });

  it("breaks the rock when an adjacent crop is harvested", () => {
    const state = createInitialState(0, rocked(), SEED);
    const rockId = at(state, 1, 1)?.id;

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 1);
    stack(state, { currentValue: 5 });
    const report = placeFromTray(state, 0, 0);

    expect(report?.effects).toContainEqual({
      type: "ROCK_BROKEN",
      cell: cellIdFromXY(1, 1),
      pieceId: rockId,
    });
    expect(at(state, 1, 1)?.rocked).toBeFalsy();

    stack(state, { currentValue: 2 });
    const feed = placeFromTray(state, 1, 0);
    expect(feed?.effects).toContainEqual(
      expect.objectContaining({ type: "FED", to: cellIdFromXY(1, 1) }),
    );
    expect(at(state, 1, 1)?.currentValue).toBe(4);
  });

  it("orders the break after the harvest cluster's supply sweep", () => {
    const state = createInitialState(0, rocked(), SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 1);
    stack(state, { currentValue: 5 });
    const report = placeFromTray(state, 0, 0);

    expect(report?.effects.map((effect) => effect.type)).toEqual([
      "PIECE_PLACED",
      "FED",
      "HARVESTED",
      "SCORED",
      "MILESTONE_REACHED",
      "HARVESTED",
      "ROCK_BROKEN",
    ]);
  });

  it("leaves a rock untouched by a harvest that is not adjacent", () => {
    const farRock: TLevel = {
      ...level,
      data: level.data.map((entry, index) =>
        index === 8 ? cell({ piece: CARROT, value: 6, rocked: true }) : entry,
      ),
    };
    const state = createInitialState(0, farRock, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 5 });
    const report = placeFromTray(state, 0, 1);

    expect(at(state, 0, 0)).toBeNull();
    expect(
      report?.effects.some((effect) => effect.type === "ROCK_BROKEN"),
    ).toBe(false);
    expect(at(state, 2, 2)?.rocked).toBe(true);
  });

  it("never breaks the same rock twice", () => {
    const state = createInitialState(0, rocked(), SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 1);
    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    expect(at(state, 1, 1)?.rocked).toBeFalsy();

    stack(state, { currentValue: 6 });
    const pop = placeFromTray(state, 1, 0);
    expect(at(state, 1, 1)).toBeNull();
    expect(pop?.effects.some((effect) => effect.type === "ROCK_BROKEN")).toBe(
      false,
    );
  });

  it("counts a rocked cell as occupied when the board fills", () => {
    const rockedRow: TLevel = {
      ...rowLevel,
      data: rowLevel.data.map((entry, index) =>
        index === 2 ? cell({ piece: CARROT, value: 6, rocked: true }) : entry,
      ),
    };
    const state = createInitialState(0, rockedRow, SEED);

    stack(state, { assetKey: CARROT, currentValue: 12 });
    placeFromTray(state, 0, 0);
    stack(state, { assetKey: CARROT, currentValue: 5 });
    const filling = placeFromTray(state, 1, 0);

    expect(
      filling?.effects.filter((effect) => effect.type === "LEVEL_FAILED"),
    ).toEqual([{ type: "LEVEL_FAILED" }]);
  });

  it("advances goals normally once a freed goal crop is harvested", () => {
    const state = createInitialState(
      0,
      rocked({ piece: APPLE, value: 2 }),
      SEED,
    );
    const goal = state.goals[0];

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 1);
    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    expect(goal.progress).toBe(1);

    stack(state, { currentValue: 2 });
    const pop = placeFromTray(state, 1, 0);

    expect(at(state, 1, 1)).toBeNull();
    expect(goal.progress).toBe(2);
    expect(pop?.effects.some((effect) => effect.type === "SCORED")).toBe(true);
  });
});

describe("swapTray", () => {
  it("swaps the two rightmost pieces for free", () => {
    const state = createInitialState(0, level, SEED);
    const before = [...state.tray];
    const rngBefore = state.rng;

    const report = swapTray(state);

    expect(state.tray).toEqual([before[0], before[2], before[1]]);
    expect(state.moves).toBe(0);
    expect(state.rng).toBe(rngBefore);
    expect(report?.effects).toEqual([
      { type: "TRAY_SWAPPED", a: before[2].id, b: before[1].id },
    ]);
  });

  it("restores the order when swapped twice", () => {
    const state = createInitialState(0, level, SEED);
    const before = [...state.tray];

    swapTray(state);
    swapTray(state);

    expect(state.tray).toEqual(before);
  });
});
