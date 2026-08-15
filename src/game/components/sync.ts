import type { Container } from "pixi.js";

/** What syncViews needs of a view. CPiece already satisfies it unchanged. */
export type IView<TDatum> = {
  container: Container;
  sync(datum: TDatum): void;
  destroy(): void;
};

export type TViewEntry<TDatum> = {
  /** Whatever the datum is keyed on — a piece id, a layer id. Stable for the
   *  datum's whole life, and never reused within a game. */
  key: number;
  datum: TDatum;
  x: number;
  y: number;
};

/**
 * Keyed reconciliation, shared by every list of views on screen: present in
 * state but not on screen → create; present in both → reposition and sync; on
 * screen but gone from state → destroy.
 *
 * A datum that moves between two of these lists (tray → board) is destroyed in
 * one and created in the other, so each list stays a plain function of the
 * slice of state it draws.
 *
 * `addChild` runs for every entry, not only new ones. Pixi treats that as a
 * move-to-end on a child it already holds, so the final child order is exactly
 * the entry order — which is how a cell's layers stay stacked bottom to top
 * without `sortableChildren` costing a sort on every change.
 */
export const syncViews = <TDatum, TView extends IView<TDatum>>(
  views: Map<number, TView>,
  parent: Container,
  entries: readonly TViewEntry<TDatum>[],
  create: (datum: TDatum) => TView,
  onCreate?: (view: TView) => void,
) => {
  const present = new Set<number>();

  for (const { key, datum, x, y } of entries) {
    present.add(key);
    let view = views.get(key);
    if (!view) {
      view = create(datum);
      views.set(key, view);
      onCreate?.(view);
    }
    parent.addChild(view.container);
    view.container.position.set(x, y);
    view.sync(datum);
  }

  for (const [key, view] of views) {
    if (present.has(key)) continue;
    view.destroy();
    views.delete(key);
  }
};
