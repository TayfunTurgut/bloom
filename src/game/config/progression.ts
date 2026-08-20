import { nextInt, randomSeed } from "../model/rng";

export const TOTAL_LEVELS = 1000;
export const ENDLESS_START = 10;
export const WRAP_BONUS_LEAVES = 50;

export type TEndless = { order: number[]; pos: number };

export type TAdvance = {
  index: number;
  endless: TEndless | null;
  awardBonus: boolean;
};

const shuffledPool = (seed: number): number[] => {
  const source = { rng: seed };
  const out: number[] = [];
  for (let i = ENDLESS_START; i < TOTAL_LEVELS; i++) out.push(i);
  for (let i = out.length - 1; i > 0; i--) {
    const j = nextInt(source, 0, i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
};

export const advanceProgress = (
  currentIndex: number,
  endless: TEndless | null,
  seed: number = randomSeed(),
): TAdvance => {
  if (!endless) {
    if (currentIndex + 1 < TOTAL_LEVELS) {
      return { index: currentIndex + 1, endless: null, awardBonus: false };
    }
    const order = shuffledPool(seed);
    return { index: order[0], endless: { order, pos: 1 }, awardBonus: true };
  }
  if (endless.pos < endless.order.length) {
    return {
      index: endless.order[endless.pos],
      endless: { order: endless.order, pos: endless.pos + 1 },
      awardBonus: false,
    };
  }
  const order = shuffledPool(seed);
  return { index: order[0], endless: { order, pos: 1 }, awardBonus: true };
};
