import type { z } from "zod";

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

export const setStorage = <T>(
  key: string,
  schema: z.ZodType<T>,
  value: T,
): void => {
  try {
    localStorage.setItem(key, JSON.stringify(schema.parse(value)));
  } catch {}
};
