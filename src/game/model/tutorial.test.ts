import { describe, expect, it } from "vitest";
import { createInitialState, placeFromTray, swapTray } from "./rules";
import { fromSnapshot, toSnapshot } from "./serialize";
import {
  actionAllowed,
  isTutorialComplete,
  tutorialView,
  type TTutorialAction,
} from "./tutorial";
import {
  TUTORIAL_LEVEL_INDEX,
  TUTORIAL_PIECE_IDS,
  TUTORIAL_STEP_CELLS,
  tutorialLevel,
} from "../config/tutorial";
import { SKINS } from "../config/skins";
import { xyFromCellId, type CellId } from "../id";
import type { TGameState } from "./types";

const SKIN = SKINS[0];
const SEED = 4242;

const start = () =>
  createInitialState(TUTORIAL_LEVEL_INDEX, tutorialLevel(SKIN), SEED);

const place = (state: TGameState, cell: CellId) => {
  const { x, y } = xyFromCellId(cell);
  return placeFromTray(state, x, y);
};

describe("tutorialView", () => {
  it("deals the scripted ids so the plant piece is played first", () => {
    const state = start();

    expect(state.tray.map((piece) => piece.id)).toEqual([
      TUTORIAL_PIECE_IDS.feeder,
      TUTORIAL_PIECE_IDS.popper,
      TUTORIAL_PIECE_IDS.plant,
    ]);
  });

  it("asks for the plant cell before the first move", () => {
    const view = tutorialView(start());

    expect(view?.step).toBe(1);
    expect(view?.action).toEqual({
      kind: "place",
      cell: TUTORIAL_STEP_CELLS.plant,
    });
    expect(view?.hint).toBeTruthy();
  });

  it("asks for a swap once the decoy sits in front", () => {
    const state = start();
    const report = place(state, TUTORIAL_STEP_CELLS.plant);

    expect(
      report?.effects.some(
        (effect) => effect.type === "SPROUTED" && effect.value === 6,
      ),
    ).toBe(true);
    expect(tutorialView(state)?.step).toBe(2);
    expect(tutorialView(state)?.action).toEqual({ kind: "swap" });
  });

  it("asks for the feed cell after the swap", () => {
    const state = start();
    place(state, TUTORIAL_STEP_CELLS.plant);
    swapTray(state);

    expect(tutorialView(state)?.action).toEqual({
      kind: "place",
      cell: TUTORIAL_STEP_CELLS.feed,
    });

    const report = place(state, TUTORIAL_STEP_CELLS.feed);
    expect(report?.effects).toContainEqual(
      expect.objectContaining({ type: "FED", remaining: 2 }),
    );
  });

  it("keeps asking for a swap if the player swaps back", () => {
    const state = start();
    place(state, TUTORIAL_STEP_CELLS.plant);
    swapTray(state);
    swapTray(state);

    expect(tutorialView(state)?.action).toEqual({ kind: "swap" });
  });

  it("walks the pop into the goal panel and then steps aside", () => {
    const state = start();
    place(state, TUTORIAL_STEP_CELLS.plant);
    swapTray(state);
    place(state, TUTORIAL_STEP_CELLS.feed);

    expect(tutorialView(state)?.step).toBe(3);
    expect(tutorialView(state)?.action).toEqual({
      kind: "place",
      cell: TUTORIAL_STEP_CELLS.pop,
    });

    const report = place(state, TUTORIAL_STEP_CELLS.pop);
    const types = report?.effects.map((effect) => effect.type);
    expect(types).toContain("HARVESTED");
    expect(types).toContain("SCORED");
    expect(types).toContain("MILESTONE_REACHED");
    expect(state.goals[0].progress).toBe(1);
    expect([...state.board.values()].every((cell) => !cell.piece)).toBe(true);

    expect(tutorialView(state)).toBeNull();
    expect(isTutorialComplete(state)).toBe(true);
  });

  it("survives a save and restore mid-tutorial", () => {
    const state = start();
    place(state, TUTORIAL_STEP_CELLS.plant);
    swapTray(state);

    const restored = fromSnapshot(
      toSnapshot(state, SKIN.id),
      TUTORIAL_LEVEL_INDEX,
      tutorialLevel(SKIN),
    );

    expect(restored).not.toBeNull();
    expect(tutorialView(restored!)?.action).toEqual({
      kind: "place",
      cell: TUTORIAL_STEP_CELLS.feed,
    });
  });

  it("stays out of every other level", () => {
    const state = createInitialState(1, tutorialLevel(SKIN), SEED);

    expect(tutorialView(state)).toBeNull();
    expect(isTutorialComplete(state)).toBe(false);
  });
});

describe("actionAllowed", () => {
  const placePlant: TTutorialAction = {
    kind: "place",
    cell: TUTORIAL_STEP_CELLS.plant,
  };
  const placeFeed: TTutorialAction = {
    kind: "place",
    cell: TUTORIAL_STEP_CELLS.feed,
  };

  it("only lets the directed action through", () => {
    const view = tutorialView(start());

    expect(actionAllowed(view, placePlant)).toBe(true);
    expect(actionAllowed(view, placeFeed)).toBe(false);
    expect(actionAllowed(view, { kind: "swap" })).toBe(false);
  });

  it("allows everything once the tutorial stands down", () => {
    expect(actionAllowed(null, placeFeed)).toBe(true);
    expect(actionAllowed(null, { kind: "swap" })).toBe(true);
  });
});
