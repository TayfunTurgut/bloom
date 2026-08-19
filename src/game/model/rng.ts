type TRandomSource = { rng: number };

export const nextFloat = (source: TRandomSource): number => {
  source.rng = (source.rng + 0x6d2b79f5) | 0;
  let t = source.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const nextInt = (
  source: TRandomSource,
  min: number,
  max: number,
): number => min + Math.floor(nextFloat(source) * (max - min + 1));

export const nextFrom = <T>(source: TRandomSource, pool: readonly T[]): T =>
  pool[Math.floor(nextFloat(source) * pool.length)];

export const randomSeed = (): number =>
  (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
