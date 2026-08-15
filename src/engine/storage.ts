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

/**
 * Best-effort write: validates `value` against `schema` and persists it, but
 * never throws. Callers save from inside event handlers, where a throw would
 * escape the interaction that triggered it and break every one after — losing
 * a save is the cheaper failure than losing the session.
 *
 * `localStorage` really does refuse writes in the wild (quota exhausted, iOS
 * private browsing). The cost of swallowing is that a schema mismatch — a bug,
 * not an environment — goes unnoticed in production, which is why the model's
 * round-trip tests have to be the ones that catch it.
 */
export const setStorage = <T>(
  key: string,
  schema: z.ZodType<T>,
  value: T,
): void => {
  try {
    localStorage.setItem(key, JSON.stringify(schema.parse(value)));
  } catch {
    // Nothing useful to do here: the caller has no fallback to fall back to.
  }
};
