import type { AssetKey } from "../../assetpack/assets";
import { nextInt } from "../model/rng";
import { levelSchema, type TLevel } from "./schema";
import type { TSkin } from "./skins";
import { TEMPLATES, type TTemplate } from "./templates";

export const EASY_LEVELS = 10;
const TIER_SPAN = 60;

type TTierParams = {
  goals: [number, number];
  target: [number, number];
  pool: [number, number];
};

const TIER_PARAMS: readonly TTierParams[] = [
  { goals: [1, 1], target: [2, 3], pool: [3, 3] },
  { goals: [1, 2], target: [3, 4], pool: [4, 4] },
  { goals: [2, 2], target: [3, 5], pool: [5, 5] },
  { goals: [2, 3], target: [4, 6], pool: [6, 6] },
  { goals: [3, 4], target: [4, 7], pool: [8, 8] },
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

  const level: TLevel = {
    data: buildData(template.rows),
    columns: template.rows[0].length,
    goals,
    pieces: pool,
  };

  if (import.meta.env.DEV) levelSchema.parse(level);
  return level;
};
