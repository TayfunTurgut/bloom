/** Anything carrying a PRNG cursor — in practice `TGameState`. */
type TRandomSource = { rng: number };

/**
 * mulberry32: a small, fast PRNG whose entire state is a single 32-bit
 * integer. That is why it is here rather than `Math.random` — the state
 * serializes as one number, so a restored save continues the same sequence
 * instead of re-rolling the tray.
 */
export const nextFloat = (source: TRandomSource): number => {
  source.rng = (source.rng + 0x6d2b79f5) | 0;
  let t = source.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Uniform integer in [min, max], both inclusive. */
export const nextInt = (
  source: TRandomSource,
  min: number,
  max: number,
): number => min + Math.floor(nextFloat(source) * (max - min + 1));

/** Picks one entry; the caller guarantees a non-empty pool. */
export const nextFrom = <T>(source: TRandomSource, pool: readonly T[]): T =>
  pool[Math.floor(nextFloat(source) * pool.length)];

export const randomSeed = (): number =>
  (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
