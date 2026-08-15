import { describe, expect, it } from "vitest";
import { CStore } from "./store";

class CCounter extends CStore<{ count: number }> {
  increment() {
    this._state.count += 1;
    this.notify();
  }
}

describe("CStore", () => {
  it("hands each listener the state as it stands after the change", () => {
    const store = new CCounter({ count: 0 });
    const seen: number[] = [];
    store.subscribe((state) => seen.push(state.count));

    store.increment();
    store.increment();

    expect(seen).toEqual([1, 2]);
  });

  it("stops delivering once a listener unsubscribes", () => {
    const store = new CCounter({ count: 0 });
    const seen: number[] = [];
    const unsubscribe = store.subscribe((state) => seen.push(state.count));

    store.increment();
    unsubscribe();
    store.increment();

    expect(seen).toEqual([1]);
  });

  // The two cases below are the whole point of notify's snapshot of the
  // listener set: a notification reaches exactly the listeners that were
  // subscribed when it began, whatever the callbacks do to that set.
  it("still delivers to a listener unsubscribed mid-notification", () => {
    const store = new CCounter({ count: 0 });
    const seen: string[] = [];
    store.subscribe(() => {
      seen.push("first");
      unsubscribeSecond();
    });
    const unsubscribeSecond = store.subscribe(() => seen.push("second"));

    store.increment();
    store.increment();

    expect(seen).toEqual(["first", "second", "first"]);
  });

  it("defers a listener subscribed mid-notification to the next change", () => {
    const store = new CCounter({ count: 0 });
    const seen: number[] = [];
    let added = false;
    store.subscribe(() => {
      if (added) return;
      added = true;
      store.subscribe((state) => seen.push(state.count));
    });

    store.increment();
    expect(seen).toEqual([]);

    store.increment();
    expect(seen).toEqual([2]);
  });
});
