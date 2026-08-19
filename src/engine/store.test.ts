import { describe, expect, it } from "vitest";
import { CStore } from "./store";

class CCounter extends CStore<{ count: number }> {
  increment() {
    this._state.count += 1;
    this.notify();
  }
}

class CLedger extends CStore<{ count: number }, string[]> {
  add(...reasons: string[]) {
    this._state.count += reasons.length;
    this.notify(reasons);
  }

  reset() {
    this._state.count = 0;
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

describe("a store whose changes carry an event", () => {
  it("hands the listener the state and the event together", () => {
    const store = new CLedger({ count: 0 });
    const seen: [number, string[] | undefined][] = [];
    store.subscribe((state, event) => seen.push([state.count, event]));

    store.add("first", "second");

    expect(seen).toEqual([[2, ["first", "second"]]]);
  });

  it("passes undefined for a change with nothing to say", () => {
    const store = new CLedger({ count: 0 });
    const seen: (string[] | undefined)[] = [];
    store.subscribe((_state, event) => seen.push(event));

    store.add("a");
    store.reset();

    expect(seen).toEqual([["a"], undefined]);
  });
});
