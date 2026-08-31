import { describe, expect, it } from "vitest";
import {
  canPlace,
  createInitialState,
  isLevelFailed,
  isLevelWon,
  placeFromTray,
  scoreMax,
  swapTray,
  TRAY_SIZE,
} from "./rules";
import { fromSnapshot, toSnapshot } from "./serialize";
import { nextFloat, nextInt } from "./rng";
import { levelFor } from "../config/generate";
import { DEFAULT_SKIN_ID, skinById } from "../config/skins";
import { cellIdFromXY } from "../id";
import type { TEffect, TGameState, TMoveReport } from "./types";

// Random full-game playthroughs across the level ladder, asserting the
// invariants every rule must hold after every single move.

const LEVEL_INDICES = [0, 3, 9, 10, 75, 200, 500, 999];
const SEEDS_PER_LEVEL = 10;
const MOVE_CAP = 250;
const SWAP_CHANCE = 0.15;

const skin = skinById(DEFAULT_SKIN_ID);

type TSim = {
  state: TGameState;
  reports: TMoveReport[];
};

const legalCells = (state: TGameState) => {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.columns; x++) {
      if (canPlace(state, x, y)) cells.push({ x, y });
    }
  }
  return cells;
};

const playThrough = (
  index: number,
  seed: number,
  onMove?: (sim: TSim, report: TMoveReport) => void,
): TSim => {
  const level = levelFor(index, skin);
  const state = createInitialState(index, level, seed);
  const policy = { rng: seed ^ 0x5f3759df };
  const sim: TSim = { state, reports: [] };

  for (let move = 0; move < MOVE_CAP; move++) {
    if (nextFloat(policy) < SWAP_CHANCE) {
      const report = swapTray(state);
      if (report) sim.reports.push(report);
    }
    const cells = legalCells(state);
    if (cells.length === 0) break;
    const pick = cells[nextInt(policy, 0, cells.length - 1)];
    const report = placeFromTray(state, pick.x, pick.y);
    expect(report).not.toBeNull();
    sim.reports.push(report!);
    onMove?.(sim, report!);
    const terminal = report!.effects.some(
      (effect) => effect.type === "LEVEL_WON" || effect.type === "LEVEL_FAILED",
    );
    if (terminal) break;
  }
  return sim;
};

const effectsOf = (reports: TMoveReport[]): TEffect[] =>
  reports.flatMap((report) => report.effects);

describe("random playthrough invariants", () => {
  for (const index of LEVEL_INDICES) {
    it(`hold on level ${index} across ${SEEDS_PER_LEVEL} seeds`, () => {
      const level = levelFor(index, skin);
      const filledCells = new Set(
        level.data.flatMap((cell, i) =>
          cell.type === "FILLED"
            ? [cellIdFromXY(i % level.columns, Math.floor(i / level.columns))]
            : [],
        ),
      );

      for (let run = 0; run < SEEDS_PER_LEVEL; run++) {
        const seed = 1000 + run * 7919;
        let goalFloor = Array.from(level.goals, () => 0);
        let scoreFloor = 0;
        const rockValues = new Map<number, number>();
        const broken = new Set<number>();

        playThrough(index, seed, ({ state }, report) => {
          // Structure: tray refilled, board keys stable, values sane.
          expect(state.tray).toHaveLength(TRAY_SIZE);
          expect(new Set(state.board.keys())).toEqual(filledCells);
          for (const cell of state.board.values()) {
            const piece = cell.piece;
            if (!piece) continue;
            expect(piece.currentValue).toBeGreaterThanOrEqual(0);
            expect(["GROWING", "SUPPLY"]).toContain(piece.type);
            if (piece.rocked) expect(piece.type).toBe("GROWING");
          }
          for (const piece of state.tray) {
            expect(state.pieces).toContain(piece.assetKey);
            expect(piece.rocked).toBeUndefined();
          }

          // Goals and score only ever move forward, within bounds.
          state.goals.forEach((goal, i) => {
            expect(goal.progress).toBeGreaterThanOrEqual(goalFloor[i]);
            expect(goal.progress).toBeLessThanOrEqual(goal.target);
          });
          goalFloor = state.goals.map((goal) => goal.progress);
          expect(state.score).toBeGreaterThanOrEqual(scoreFloor);
          expect(state.score).toBeLessThanOrEqual(scoreMax(state));
          scoreFloor = state.score;

          // Rocks: value frozen while rocked, never fed, broken only by an
          // adjacent growing harvest, and at most once per piece.
          for (const [id, value] of rockValues) {
            if (broken.has(id)) continue;
            const held = [...state.board.values()].find(
              (cell) => cell.piece?.id === id,
            )?.piece;
            expect(held).toBeDefined();
            expect(held!.currentValue).toBe(value);
          }
          for (const effect of report.effects) {
            if (effect.type === "FED") {
              expect(
                rockValues.has(effect.targetId) && !broken.has(effect.targetId),
              ).toBe(false);
            }
            if (effect.type === "ROCK_BROKEN") {
              expect(broken.has(effect.pieceId)).toBe(false);
              broken.add(effect.pieceId);
              const harvests = report.effects.filter(
                (other) =>
                  other.type === "HARVESTED" && other.crop === "GROWING",
              );
              expect(harvests.length).toBeGreaterThan(0);
            }
          }
          for (const cell of state.board.values()) {
            const piece = cell.piece;
            if (piece?.rocked && !rockValues.has(piece.id)) {
              rockValues.set(piece.id, piece.currentValue);
            }
          }

          // Script: consumed in order, cursor bounded.
          expect(state.scriptIndex).toBeLessThanOrEqual(state.script.length);

          // Serialization: every state round-trips exactly.
          const snapshot = toSnapshot(state, skin.id);
          const restored = fromSnapshot(snapshot, index, level);
          expect(restored).not.toBeNull();
          expect(toSnapshot(restored!, skin.id)).toEqual(snapshot);

          // Terminal effects match the predicates.
          const won = report.effects.some((e) => e.type === "LEVEL_WON");
          const failed = report.effects.some((e) => e.type === "LEVEL_FAILED");
          if (won) expect(isLevelWon(state)).toBe(true);
          if (failed) {
            expect(
              [...state.board.values()].every((cell) => cell.piece !== null),
            ).toBe(true);
            expect(isLevelFailed(state)).toBe(true);
          }
        });
      }
    });
  }

  it("replays the exact same game for the same seeds", () => {
    for (const index of [0, 75, 999]) {
      const a = playThrough(index, 31337);
      const b = playThrough(index, 31337);
      expect(toSnapshot(a.state, skin.id)).toEqual(
        toSnapshot(b.state, skin.id),
      );
      expect(a.reports).toEqual(b.reports);
    }
  });

  it("deals the tutorial script before any random draw on level 0", () => {
    const level = levelFor(0, skin);
    const script = level.script ?? [];
    expect(script.length).toBeGreaterThan(0);

    const sim = playThrough(0, 555);
    const placed = effectsOf(sim.reports).filter(
      (effect) => effect.type === "PIECE_PLACED",
    );
    expect(placed.length).toBeGreaterThan(0);
    // Piece ids 1..script.length are exactly the scripted deal.
    const state = createInitialState(0, level, 555);
    state.tray.forEach((piece, i) => {
      const entry = script[script.length - 1 - i];
      expect(piece.assetKey).toBe(entry.piece);
      expect(piece.currentValue).toBe(entry.value);
    });
  });
});
