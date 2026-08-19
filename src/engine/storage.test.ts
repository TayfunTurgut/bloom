import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { getStorage, setStorage } from "./storage";

const KEY = "test:save";
const schema = z.object({ moves: z.number().int().min(0) });
const fallback = { moves: 0 };

const stubStorage = (setItem?: () => never) => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem:
      setItem ?? ((key: string, value: string) => entries.set(key, value)),
  });
  return entries;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStorage", () => {
  it("falls back when the key was never written", () => {
    stubStorage();
    expect(getStorage(KEY, schema, fallback)).toBe(fallback);
  });

  it("falls back on a value that isn't JSON", () => {
    stubStorage().set(KEY, "{not json");
    expect(getStorage(KEY, schema, fallback)).toBe(fallback);
  });

  it("falls back on JSON the schema rejects", () => {
    stubStorage().set(KEY, JSON.stringify({ moves: -1 }));
    expect(getStorage(KEY, schema, fallback)).toBe(fallback);
  });

  it("round-trips a value written by setStorage", () => {
    stubStorage();
    setStorage(KEY, schema, { moves: 7 });
    expect(getStorage(KEY, schema, fallback)).toEqual({ moves: 7 });
  });
});

describe("setStorage", () => {
  it("survives a backing store that refuses to write", () => {
    stubStorage(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() => setStorage(KEY, schema, { moves: 7 })).not.toThrow();
  });

  it("survives a value the schema rejects, writing nothing", () => {
    const entries = stubStorage();

    expect(() => setStorage(KEY, schema, { moves: -1 })).not.toThrow();
    expect(entries.has(KEY)).toBe(false);
  });
});
