import { describe, expect, it } from "vitest";
import {
  createInitialState,
  goalRemaining,
  isGoalComplete,
  PIECE_VALUE_MAX,
  placeFromTray,
  TRAY_SIZE,
  type TLevel,
} from "./rules";
import { cellIdFromXY } from "../id";
import type { TGameState, TPiece } from "./types";

const APPLE = "apple_half/happy";
const CARROT = "carrot/happy";

const level: TLevel = {
  data: Array.from({ length: 9 }, () => ({ type: "FILLED" as const })),
  columns: 3,
  goals: [{ type: APPLE, count: 2 }],
  pieces: [APPLE, CARROT],
};

/** The same 3x3 board with the centre cell cut out. */
const holedLevel: TLevel = {
  ...level,
  data: level.data.map((cell, index) =>
    index === 4 ? { type: "EMPTY" as const } : cell,
  ),
};

const SEED = 12345;

/** The tray is plain data, so a test can simply decide what comes next. */
const stack = (state: TGameState, ...pieces: Partial<TPiece>[]) => {
  state.tray = pieces.map((piece, index) => ({
    id: 1000 + index,
    assetKey: APPLE,
    type: "BLOOM",
    startingValue: 5,
    currentValue: 5,
    ...piece,
  }));
};

const at = (state: TGameState, x: number, y: number) =>
  state.board.get(cellIdFromXY(x, y));

describe("createInitialState", () => {
  it("opens with an empty board, a full tray and zeroed goals", () => {
    const state = createInitialState(0, level, SEED);

    expect(state.board.size).toBe(9);
    expect([...state.board.values()].every((cell) => cell === null)).toBe(true);
    expect(state.tray).toHaveLength(TRAY_SIZE);
    expect(state.goals).toEqual([{ type: APPLE, target: 2, progress: 0 }]);
    expect(state.moves).toBe(0);
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

    const drawn = [...state.board.values(), ...state.tray].filter(
      (piece): piece is TPiece => piece != null,
    );
    expect(drawn.every((piece) => level.pieces.includes(piece.assetKey))).toBe(
      true,
    );
  });
});

describe("placeFromTray", () => {
  it("moves the front tray piece onto the cell and refills behind it", () => {
    const state = createInitialState(0, level, SEED);
    const front = state.tray[state.tray.length - 1];

    expect(placeFromTray(state, 1, 1)).toBe(true);
    expect(at(state, 1, 1)).toBe(front);
    expect(state.moves).toBe(1);
    expect(state.tray).toHaveLength(TRAY_SIZE);
    expect(state.tray).not.toContain(front);
  });

  it("leaves an isolated flower blooming", () => {
    const state = createInitialState(0, level, SEED);
    stack(state, { currentValue: 5 });

    placeFromTray(state, 0, 0);

    expect(at(state, 0, 0)?.type).toBe("BLOOM");
    expect(at(state, 0, 0)?.currentValue).toBe(5);
  });

  it("turns a flower with neighbours into supply and drains the strongest", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: 7 });
    placeFromTray(state, 2, 0);
    stack(state, { currentValue: 3 });
    placeFromTray(state, 1, 0);

    expect(at(state, 1, 0)?.type).toBe("SUPPLY");
    expect(at(state, 2, 0)?.currentValue).toBe(4); // 7 - 3, the higher neighbour
    expect(at(state, 0, 0)?.currentValue).toBe(5); // untouched
  });

  it("drains the neighbour above when two neighbours tie on value", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 6 });
    placeFromTray(state, 1, 0);
    stack(state, { currentValue: 6 });
    placeFromTray(state, 0, 1);
    stack(state, { currentValue: 2 });
    placeFromTray(state, 1, 1);

    // The candidate order in neighborsOf is load-bearing: the reduce keeps the
    // later entry on a tie, so `up` wins over `left`. Reordering that list
    // would quietly change which flower drains.
    expect(at(state, 1, 0)?.currentValue).toBe(4);
    expect(at(state, 0, 1)?.currentValue).toBe(6);
  });

  it("lets a drain take its target below zero", () => {
    const state = createInitialState(0, level, SEED);

    stack(state, { currentValue: 1 });
    placeFromTray(state, 0, 0);
    stack(state, { currentValue: PIECE_VALUE_MAX });
    placeFromTray(state, 1, 0);

    // Save schemas that bound currentValue at zero would reject this state at
    // runtime, on a device, with no way back — see state/schema.ts.
    expect(at(state, 0, 0)?.currentValue).toBe(1 - PIECE_VALUE_MAX);
  });

  it("rejects an occupied cell and one off the board, changing nothing", () => {
    const state = createInitialState(0, level, SEED);
    placeFromTray(state, 0, 0);
    const before = [...state.tray];

    expect(placeFromTray(state, 0, 0)).toBe(false);
    expect(placeFromTray(state, 3, 0)).toBe(false);
    expect(placeFromTray(state, -1, 0)).toBe(false);
    expect(state.moves).toBe(1);
    expect(state.tray).toEqual(before);
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

    expect(placeFromTray(state, 1, 1)).toBe(false);
    expect(state.moves).toBe(0);
    expect(state.tray).toEqual(before);
  });

  it("does not let flowers reach across a hole", () => {
    const state = createInitialState(0, holedLevel, SEED);

    stack(state, { currentValue: 5 });
    placeFromTray(state, 1, 0);
    stack(state, { currentValue: 3 });
    placeFromTray(state, 1, 2);

    expect(at(state, 1, 2)?.type).toBe("BLOOM");
    expect(at(state, 1, 0)?.currentValue).toBe(5);
  });
});

describe("goal progress", () => {
  it("advances only on a matching flower and stops at the target", () => {
    const state = createInitialState(0, level, SEED);
    const goal = state.goals[0];

    stack(state, { assetKey: CARROT });
    placeFromTray(state, 0, 0);
    expect(goal.progress).toBe(0);

    stack(state, { assetKey: APPLE });
    placeFromTray(state, 2, 2);
    expect(goal.progress).toBe(1);
    expect(goalRemaining(goal)).toBe(1);
    expect(isGoalComplete(goal)).toBe(false);

    stack(state, { assetKey: APPLE }, { assetKey: APPLE });
    placeFromTray(state, 0, 2);
    placeFromTray(state, 2, 0);

    expect(goal.progress).toBe(2);
    expect(goalRemaining(goal)).toBe(0);
    expect(isGoalComplete(goal)).toBe(true);
  });
});
