import { describe, expect, it } from "vitest";
import { createInitialState, placeFromTray, type TLevel } from "./rules";
import { fromSnapshot, toSnapshot } from "./serialize";
import { emptySaveState, saveStateSchema } from "../state/schema";
import { cellIdFromXY } from "../id";

const APPLE = "apple_half/happy";
const CARROT = "carrot/happy";

const level: TLevel = {
  data: Array.from({ length: 9 }, () => ({ type: "FILLED" as const })),
  columns: 3,
  goals: [{ type: APPLE, count: 2 }],
  pieces: [APPLE, CARROT],
};

/** The same 3x3 board with the centre cell — index 4, where `played` puts its
 *  first flower — cut out. */
const holedLevel: TLevel = {
  ...level,
  data: level.data.map((cell, index) =>
    index === 4 ? { type: "EMPTY" as const } : cell,
  ),
};

const played = () => {
  const state = createInitialState(0, level, 999);
  placeFromTray(state, 1, 1);
  placeFromTray(state, 1, 2);
  return state;
};

describe("toSnapshot", () => {
  it("writes what the save schema accepts", () => {
    expect(saveStateSchema.safeParse(toSnapshot(played())).success).toBe(true);
  });

  it("accepts a flower that a drain took below zero", () => {
    const state = played();
    const drained = [...state.board.values()].find((piece) => piece !== null);
    drained!.currentValue = -11;

    // state/schema.ts leaves currentValue unbounded on purpose. Bounding it at
    // zero would make every save after a deep drain fail to write — silently,
    // on a device, with the player's progress as the cost.
    expect(saveStateSchema.safeParse(toSnapshot(state)).success).toBe(true);
  });

  it("writes one board entry per cell, row-major", () => {
    const state = createInitialState(0, level, 1);
    placeFromTray(state, 2, 0); // index 2 in row-major order

    const snapshot = toSnapshot(state);
    expect(snapshot.board).toHaveLength(9);
    expect(snapshot.board[2]).not.toBeNull();
    expect(snapshot.board.filter(Boolean)).toHaveLength(1);
  });
});

describe("fromSnapshot", () => {
  it("round-trips a game in progress", () => {
    const state = played();
    const snapshot = toSnapshot(state);

    const restored = fromSnapshot(snapshot, 0, level);

    expect(restored).not.toBeNull();
    expect(toSnapshot(restored!)).toEqual(snapshot);
  });

  it("keeps drawing the sequence the interrupted game would have drawn", () => {
    const state = played();
    const restored = fromSnapshot(toSnapshot(state), 0, level);

    placeFromTray(state, 0, 0);
    placeFromTray(restored!, 0, 0);

    expect(toSnapshot(restored!)).toEqual(toSnapshot(state));
  });

  it("rejects the empty placeholder save", () => {
    expect(fromSnapshot(emptySaveState(), 0, level)).toBeNull();
  });

  it("rejects a board that no longer matches the level's shape", () => {
    const snapshot = toSnapshot(played());
    const bigger: TLevel = {
      ...level,
      data: Array.from({ length: 12 }, () => ({ type: "FILLED" as const })),
    };
    // Same cell count, different shape — only the columns check catches this.
    const reshaped: TLevel = { ...level, columns: 9 };

    expect(fromSnapshot(snapshot, 0, bigger)).toBeNull();
    expect(fromSnapshot(snapshot, 0, reshaped)).toBeNull();
  });

  it("rejects a piece whose art the level no longer loads", () => {
    const snapshot = toSnapshot(played());
    const trimmed: TLevel = { ...level, pieces: [CARROT] };

    expect(fromSnapshot(snapshot, 0, trimmed)).toBeNull();
  });

  it("rejects goals that no longer match the level", () => {
    const snapshot = toSnapshot(played());
    const retuned: TLevel = { ...level, goals: [{ type: APPLE, count: 5 }] };

    expect(fromSnapshot(snapshot, 0, retuned)).toBeNull();
    expect(fromSnapshot(snapshot, 1, level)).toBeNull(); // wrong level index
  });

  it("never hands a restored piece an id that is already in play", () => {
    const snapshot = toSnapshot(played());
    snapshot.nextPieceId = 1; // as a doctored save might claim

    const restored = fromSnapshot(snapshot, 0, level);
    const ids = [...snapshot.tray, ...snapshot.board.filter(Boolean)].map(
      (piece) => piece!.id,
    );
    expect(restored!.nextPieceId).toBeGreaterThan(Math.max(...ids));
  });
});

describe("a level with holes", () => {
  it("round-trips a game played around them", () => {
    const state = createInitialState(0, holedLevel, 999);
    placeFromTray(state, 0, 0);
    placeFromTray(state, 2, 2);

    const restored = fromSnapshot(toSnapshot(state), 0, holedLevel);

    expect(restored).not.toBeNull();
    expect(restored!.board.has(cellIdFromXY(1, 1))).toBe(false);
    expect(toSnapshot(restored!)).toEqual(toSnapshot(state));
  });

  it("rejects a save holding a flower where the level now has a hole", () => {
    const snapshot = toSnapshot(played());
    expect(snapshot.board[4]).not.toBeNull();

    expect(fromSnapshot(snapshot, 0, holedLevel)).toBeNull();
  });
});

describe("an older save file", () => {
  it("fails the schema instead of loading half a game", () => {
    expect(saveStateSchema.safeParse({ level: 0 }).success).toBe(false);
  });
});
