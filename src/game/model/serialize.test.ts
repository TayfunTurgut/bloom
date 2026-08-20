import { describe, expect, it } from "vitest";
import { createInitialState, placeFromTray, type TLevel } from "./rules";
import { fromSnapshot, toSnapshot } from "./serialize";
import { emptySaveState, saveStateSchema } from "../state/schema";
import { cellIdFromXY } from "../id";

const APPLE = "apple_happy";
const CARROT = "carrot_happy";
const SKIN = "garden";

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

const authoredLevel: TLevel = {
  ...level,
  data: level.data.map((entry, index) =>
    index === 8 ? cell({ piece: CARROT, value: 6 }) : entry,
  ),
};

const played = () => {
  const state = createInitialState(0, level, 999);
  placeFromTray(state, 1, 1);
  placeFromTray(state, 2, 2);
  return state;
};

describe("toSnapshot", () => {
  it("writes what the save schema accepts", () => {
    expect(saveStateSchema.safeParse(toSnapshot(played(), SKIN)).success).toBe(
      true,
    );
  });

  it("rejects a crop with a negative value, which the rules forbid", () => {
    const state = played();
    state.tray[0].currentValue = -1;

    expect(saveStateSchema.safeParse(toSnapshot(state, SKIN)).success).toBe(
      false,
    );
  });

  it("rejects an unknown crop state", () => {
    const snapshot = toSnapshot(played(), SKIN);
    (snapshot.tray[0] as { type: string }).type = "WEED";

    expect(saveStateSchema.safeParse(snapshot).success).toBe(false);
  });

  it("writes one board entry per cell, row-major", () => {
    const state = createInitialState(0, level, 1);
    placeFromTray(state, 2, 0);

    const snapshot = toSnapshot(state, SKIN);
    expect(snapshot.board).toHaveLength(9);
    expect(snapshot.board[2]).not.toBeNull();
    expect(snapshot.board.filter((piece) => piece !== null)).toHaveLength(1);
  });
});

describe("fromSnapshot", () => {
  it("round-trips a game in progress", () => {
    const state = played();
    const snapshot = toSnapshot(state, SKIN);

    const restored = fromSnapshot(snapshot, 0, level);

    expect(restored).not.toBeNull();
    expect(toSnapshot(restored!, SKIN)).toEqual(snapshot);
  });

  it("keeps drawing the sequence the interrupted game would have drawn", () => {
    const state = played();
    const restored = fromSnapshot(toSnapshot(state, SKIN), 0, level);

    placeFromTray(state, 0, 0);
    placeFromTray(restored!, 0, 0);

    expect(toSnapshot(restored!, SKIN)).toEqual(toSnapshot(state, SKIN));
  });

  it("rejects the empty placeholder save", () => {
    expect(fromSnapshot(emptySaveState(), 0, level)).toBeNull();
  });

  it("rejects a board that no longer matches the level's shape", () => {
    const snapshot = toSnapshot(played(), SKIN);
    const bigger: TLevel = {
      ...level,
      data: Array.from({ length: 12 }, () => cell()),
    };
    const reshaped: TLevel = { ...level, columns: 9 };

    expect(fromSnapshot(snapshot, 0, bigger)).toBeNull();
    expect(fromSnapshot(snapshot, 0, reshaped)).toBeNull();
  });

  it("rejects a piece whose art the level no longer loads", () => {
    const snapshot = toSnapshot(played(), SKIN);
    const trimmed: TLevel = { ...level, pieces: [CARROT] };

    expect(fromSnapshot(snapshot, 0, trimmed)).toBeNull();
  });

  it("rejects goals that no longer match the level", () => {
    const snapshot = toSnapshot(played(), SKIN);
    const retuned: TLevel = { ...level, goals: [{ type: APPLE, count: 5 }] };

    expect(fromSnapshot(snapshot, 0, retuned)).toBeNull();
    expect(fromSnapshot(snapshot, 1, level)).toBeNull();
  });

  it("never hands a restored piece an id that is already in play", () => {
    const snapshot = toSnapshot(played(), SKIN);
    snapshot.nextPieceId = 1;

    const restored = fromSnapshot(snapshot, 0, level);
    const ids = [
      ...snapshot.tray,
      ...snapshot.board.filter((piece) => piece !== null),
    ].map((piece) => piece.id);
    expect(restored!.nextPieceId).toBeGreaterThan(Math.max(...ids));
  });
});

describe("a level with holes", () => {
  it("round-trips a game played around them", () => {
    const state = createInitialState(0, holedLevel, 999);
    placeFromTray(state, 0, 0);
    placeFromTray(state, 2, 2);

    const restored = fromSnapshot(toSnapshot(state, SKIN), 0, holedLevel);

    expect(restored).not.toBeNull();
    expect(restored!.board.has(cellIdFromXY(1, 1))).toBe(false);
    expect(toSnapshot(restored!, SKIN)).toEqual(toSnapshot(state, SKIN));
  });

  it("rejects a save holding a crop where the level now has a hole", () => {
    const state = createInitialState(0, level, 999);
    placeFromTray(state, 1, 1);

    expect(fromSnapshot(toSnapshot(state, SKIN), 0, holedLevel)).toBeNull();
  });
});

describe("an authored growing crop", () => {
  it("round-trips its type and value", () => {
    const state = createInitialState(0, authoredLevel, 999);
    placeFromTray(state, 0, 0);

    const restored = fromSnapshot(toSnapshot(state, SKIN), 0, authoredLevel);

    expect(restored).not.toBeNull();
    const piece = restored!.board.get(cellIdFromXY(2, 2))!.piece;
    expect(piece?.type).toBe("GROWING");
    expect(piece?.currentValue).toBe(6);
    expect(toSnapshot(restored!, SKIN)).toEqual(toSnapshot(state, SKIN));
  });
});

describe("an older save file", () => {
  it("fails the schema instead of loading half a game", () => {
    expect(saveStateSchema.safeParse({ level: 0 }).success).toBe(false);
  });

  it("rejects a v3 save, whose crops were typed BLOOM", () => {
    const v3 = { ...toSnapshot(played(), SKIN), version: 3 };

    expect(saveStateSchema.safeParse(v3).success).toBe(false);
  });
});
