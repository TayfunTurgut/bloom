import type { z } from "zod";

/**
 * Reads and validates typed data from `localStorage`.
 *
 * Returns `fallback` when the key is absent, the stored value isn't valid
 * JSON, or it fails the zod schema — so callers always get a well-formed `T`.
 */
export const getStorage = <T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): T => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
};

/** Validates `value` against `schema`, then persists it to `localStorage`. */
export const setStorage = <T>(
  key: string,
  schema: z.ZodType<T>,
  value: T,
): void => {
  localStorage.setItem(key, JSON.stringify(schema.parse(value)));
};
