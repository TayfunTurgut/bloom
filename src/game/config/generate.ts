import type { AssetKey } from "../../assetpack/assets";
import { nextFrom, nextInt } from "../model/rng";
import { levelSchema, type TLevel } from "./schema";
import type { TSkin } from "./skins";
import { TEMPLATES, type TTemplate } from "./templates";
import { TUTORIAL_LEVEL_INDEX, tutorialLevel } from "./tutorial";

export const EASY_LEVELS = 10;
const TIER_SPAN = 60;

type TTierParams = {
  goals: [number, number];
  target: [number, number];
  pool: [number, number];
  rocks: [number, number];
};

const TIER_PARAMS: readonly TTierParams[] = [
  { goals: [1, 1], target: [2, 3], pool: [3, 3], rocks: [0, 0] },
  { goals: [1, 2], target: [3, 4], pool: [4, 4], rocks: [0, 0] },
  { goals: [2, 2], target: [3, 5], pool: [5, 5], rocks: [1, 2] },
  { goals: [2, 3], target: [4, 6], pool: [6, 6], rocks: [1, 3] },
  { goals: [3, 4], target: [4, 7], pool: [8, 8], rocks: [2, 3] },
];

const MAX_TIER = TIER_PARAMS.length - 1;

export const tierForIndex = (index: number): number => {
  if (index < EASY_LEVELS) return 0;
  return Math.min(MAX_TIER, 1 + Math.floor((index - EASY_LEVELS) / TIER_SPAN));
};

const seedFor = (index: number): number =>
  (Math.imul(index + 1, 0x9e3779b1) ^ 0x6d2b79f5) | 0;

const plantableOf = (template: TTemplate): number =>
  template.rows.reduce(
    (sum, row) => sum + [...row].filter((ch) => ch !== "#").length,
    0,
  );

const buildData = (rows: readonly string[]): TLevel["data"] =>
  rows.flatMap((row) =>
    [...row].map((ch) =>
      ch === "#" ? { type: "EMPTY" as const } : { type: "FILLED" as const },
    ),
  );

const pickDistinct = (
  source: { rng: number },
  pool: readonly AssetKey[],
  count: number,
): AssetKey[] => {
  const available = [...pool];
  const chosen: AssetKey[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const index = nextInt(source, 0, available.length - 1);
    chosen.push(available[index]);
    available.splice(index, 1);
  }
  return chosen;
};

const indexNeighbors = (
  index: number,
  columns: number,
  total: number,
): number[] => {
  const x = index % columns;
  const y = Math.floor(index / columns);
  const rows = total / columns;
  const found: number[] = [];
  if (x > 0) found.push(index - 1);
  if (x < columns - 1) found.push(index + 1);
  if (y > 0) found.push(index - columns);
  if (y < rows - 1) found.push(index + columns);
  return found;
};

// A rock is broken by popping a crop next to it, and popping needs room to
// feed that crop from a third cell — so every rock must keep that escape.
const placeRocks = (
  source: { rng: number },
  data: TLevel["data"],
  columns: number,
  pool: readonly AssetKey[],
  count: number,
) => {
  const rocked = new Set<number>();
  const playable = (i: number) => data[i].type === "FILLED" && !rocked.has(i);
  const neighbors = (i: number) => indexNeighbors(i, columns, data.length);
  const freeable = (i: number) =>
    neighbors(i).some(
      (j) => playable(j) && neighbors(j).some((k) => k !== i && playable(k)),
    );

  let candidates = data
    .map((_, i) => i)
    .filter((i) => playable(i) && freeable(i));
  for (let n = 0; n < count && candidates.length > 0; n++) {
    const pick = candidates[nextInt(source, 0, candidates.length - 1)];
    rocked.add(pick);
    const blocked = new Set([pick, ...neighbors(pick)]);
    candidates = candidates.filter((i) => !blocked.has(i));
  }

  for (const i of [...rocked]) {
    if (!freeable(i)) {
      rocked.delete(i);
      continue;
    }
    data[i] = {
      type: "FILLED",
      piece: nextFrom(source, pool),
      value: nextInt(source, 2, 6),
      rocked: true,
    };
  }
};

export const generateLevel = (index: number, skin: TSkin): TLevel => {
  const source = { rng: seedFor(index) };
  const tier = tierForIndex(index);
  const params = TIER_PARAMS[tier];

  const goalCount = Math.min(
    skin.crops.length,
    nextInt(source, params.goals[0], params.goals[1]),
  );
  const poolSize = Math.min(
    skin.crops.length,
    Math.max(goalCount, nextInt(source, params.pool[0], params.pool[1])),
  );

  const pool = pickDistinct(source, skin.crops, poolSize);
  const goals = pool.slice(0, goalCount).map((type) => ({
    type,
    count: nextInt(source, params.target[0], params.target[1]),
  }));
  const targetSum = goals.reduce((sum, goal) => sum + goal.count, 0);

  const candidates = TEMPLATES.filter((template) => template.tier === tier);
  const fitting = candidates.filter(
    (template) => plantableOf(template) >= targetSum,
  );
  const usable = fitting.length > 0 ? fitting : candidates;
  const template = usable[nextInt(source, 0, usable.length - 1)];

  const data = buildData(template.rows);
  if (params.rocks[1] > 0) {
    const rockCount = Math.min(
      nextInt(source, params.rocks[0], params.rocks[1]),
      Math.max(0, plantableOf(template) - targetSum),
    );
    placeRocks(source, data, template.rows[0].length, pool, rockCount);
  }

  const level: TLevel = {
    data,
    columns: template.rows[0].length,
    goals,
    pieces: pool,
  };

  if (import.meta.env.DEV) levelSchema.parse(level);
  return level;
};

export const levelFor = (index: number, skin: TSkin): TLevel =>
  index === TUTORIAL_LEVEL_INDEX
    ? tutorialLevel(skin)
    : generateLevel(index, skin);
