import { describe, expect, it } from "vitest";
import { createInitialState, placeFromTray, type TLevel } from "./rules";
import { LAYER_BEHAVIORS, pieceIn, topLayerOf } from "./layers";
import { BLOCKER_KINDS, type TGameState, type TPiece } from "./types";
import { cellIdFromXY } from "../id";

const APPLE = "apple_half/happy";
const CARROT = "carrot/happy";
const SEED = 12345;

type TCellInput = TLevel["data"][number];

const cell = (over: Partial<TCellInput> = {}): TCellInput => ({
  type: "FILLED",
  layers: [],
  ...over,
});

/** A 3x3 level, with whatever covers the test cares about placed by index. */
const levelWith = (covers: Record<number, TCellInput>): TLevel => ({
  data: Array.from({ length: 9 }, (_, index) => covers[index] ?? cell()),
  columns: 3,
  goals: [],
  pieces: [APPLE, CARROT],
});

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

const topAt = (state: TGameState, x: number, y: number) => {
  const found = state.board.get(cellIdFromXY(x, y));
  return found ? topLayerOf(found) : null;
};

const kindsAt = (state: TGameState, x: number, y: number) =>
  state.board.get(cellIdFromXY(x, y))?.layers.map((layer) => layer.kind);

describe("the behavior registry", () => {
  it("has an entry for every layer kind, blockers included", () => {
    // The Record type already makes a missing entry a compile error; this
    // catches one stubbed in with a cast, and pairs a kind with the visuals
    // registry the board looks it up in.
    for (const kind of BLOCKER_KINDS) {
      expect(LAYER_BEHAVIORS[kind]).toBeDefined();
    }
    expect(LAYER_BEHAVIORS.PIECE.triggers).toEqual([]);
  });
});

describe("a vine, which reacts to adjacency", () => {
  const vined = (hits: number) =>
    levelWith({ 4: cell({ piece: CARROT, layers: [{ kind: "VINE", hits }] }) });

  it("loses one hit per placement beside it and logs the damage", () => {
    const state = createInitialState(0, vined(3), SEED);

    stack(state, { currentValue: 2 });
    const report = placeFromTray(state, 1, 0);

    const layer = topAt(state, 1, 1);
    expect(layer).toMatchObject({ kind: "VINE", hits: 2, maxHits: 3 });
    expect(report?.effects).toContainEqual({
      type: "LAYER_DAMAGED",
      cell: cellIdFromXY(1, 1),
      layerId: layer?.id,
      kind: "VINE",
      amount: 1,
      hits: 2,
    });
  });

  it("clears at zero and reveals the flower under it", () => {
    const state = createInitialState(0, vined(1), SEED);
    const buried = pieceIn(state.board.get(cellIdFromXY(1, 1))!)!;
    const layerId = topAt(state, 1, 1)?.id;

    stack(state, { currentValue: 2 });
    const report = placeFromTray(state, 1, 0);

    expect(kindsAt(state, 1, 1)).toEqual(["PIECE"]);
    // Both effects, in this order: a view can play the hit and then the burst
    // rather than having to infer the death from a hit count.
    expect(report?.effects).toEqual([
      { type: "PIECE_PLACED", cell: cellIdFromXY(1, 0), pieceId: 1000 },
      {
        type: "LAYER_DAMAGED",
        cell: cellIdFromXY(1, 1),
        layerId,
        kind: "VINE",
        amount: 1,
        hits: 0,
      },
      {
        type: "LAYER_CLEARED",
        cell: cellIdFromXY(1, 1),
        layerId,
        kind: "VINE",
      },
      {
        type: "PIECE_REVEALED",
        cell: cellIdFromXY(1, 1),
        pieceId: buried.id,
      },
    ]);
  });

  it("ignores a placement that is not adjacent to it", () => {
    const state = createInitialState(0, vined(2), SEED);

    stack(state, { currentValue: 2 });
    const report = placeFromTray(state, 0, 0); // diagonal, not orthogonal

    expect(topAt(state, 1, 1)).toMatchObject({ hits: 2 });
    expect(report?.effects).toHaveLength(1); // the placement, nothing else
  });
});

describe("a stone slab, which reacts to the move ending", () => {
  const stoned = (hits: number) =>
    levelWith({
      4: cell({ piece: CARROT, layers: [{ kind: "STONE", hits }] }),
    });

  it("erodes wherever the player played, adjacent or not", () => {
    const state = createInitialState(0, stoned(2), SEED);

    stack(state, { currentValue: 2 });
    placeFromTray(state, 0, 0); // the far corner

    expect(topAt(state, 1, 1)).toMatchObject({ kind: "STONE", hits: 1 });
  });

  it("comes off on a timer regardless of where the moves land", () => {
    const state = createInitialState(0, stoned(2), SEED);

    stack(state, { currentValue: 2 }, { currentValue: 2 });
    placeFromTray(state, 0, 0);
    placeFromTray(state, 2, 2);

    expect(kindsAt(state, 1, 1)).toEqual(["PIECE"]);
  });
});

describe("stacking", () => {
  it("peels the topmost cover first and leaves the one under it alone", () => {
    // A stone slab over a vine over a carrot. The stone is what a trigger
    // reaches, so the vine takes nothing until the stone is gone — even though
    // this placement is adjacent, which is what a vine reacts to.
    const state = createInitialState(
      0,
      levelWith({
        4: cell({
          piece: CARROT,
          layers: [
            { kind: "VINE", hits: 1 },
            { kind: "STONE", hits: 1 },
          ],
        }),
      }),
      SEED,
    );

    stack(state, { currentValue: 2 }, { currentValue: 2 });
    placeFromTray(state, 1, 0);
    expect(kindsAt(state, 1, 1)).toEqual(["PIECE", "VINE"]);

    // Now the vine is on top, so the next adjacent placement reaches it.
    placeFromTray(state, 0, 1);
    expect(kindsAt(state, 1, 1)).toEqual(["PIECE"]);
  });

  it("does not reveal a flower while another cover is still over it", () => {
    const state = createInitialState(
      0,
      levelWith({
        4: cell({
          piece: CARROT,
          layers: [
            { kind: "VINE", hits: 1 },
            { kind: "STONE", hits: 1 },
          ],
        }),
      }),
      SEED,
    );

    stack(state, { currentValue: 2 });
    const report = placeFromTray(state, 1, 0);

    expect(
      report?.effects.some((effect) => effect.type === "PIECE_REVEALED"),
    ).toBe(false);
  });
});

describe("the effect log", () => {
  it("orders adjacency damage the way neighborsOf lists candidates", () => {
    // Vines to the right of and below (1,1), plus one to its left. resolve.ts
    // walks right, down, left, up — the same order the drain rule breaks ties
    // in — so the log must read right, then down, then left.
    const state = createInitialState(
      0,
      levelWith({
        5: cell({ layers: [{ kind: "VINE", hits: 2 }] }), // (2,1), to the right
        7: cell({ layers: [{ kind: "VINE", hits: 2 }] }), // (1,2), below
        3: cell({ layers: [{ kind: "VINE", hits: 2 }] }), // (0,1), to the left
      }),
      SEED,
    );

    stack(state, { currentValue: 2 });
    const report = placeFromTray(state, 1, 1);

    const damaged = report?.effects
      .filter((effect) => effect.type === "LAYER_DAMAGED")
      .map((effect) => effect.cell);
    expect(damaged).toEqual([
      cellIdFromXY(2, 1),
      cellIdFromXY(1, 2),
      cellIdFromXY(0, 1),
    ]);
  });

  it("reports the same effects twice from the same seed", () => {
    const level = levelWith({
      4: cell({ piece: CARROT, layers: [{ kind: "VINE", hits: 1 }] }),
    });
    const a = createInitialState(0, level, SEED);
    const b = createInitialState(0, level, SEED);

    expect(placeFromTray(a, 1, 0)).toEqual(placeFromTray(b, 1, 0));
  });

  it("carries only the placement on a level with no covers at all", () => {
    const state = createInitialState(0, levelWith({}), SEED);

    stack(state, { currentValue: 4 });
    const report = placeFromTray(state, 1, 1);

    expect(report?.moves).toBe(1);
    expect(report?.effects).toEqual([
      { type: "PIECE_PLACED", cell: cellIdFromXY(1, 1), pieceId: 1000 },
    ]);
  });
});
