import type { Container } from "pixi.js";

export type IView<TDatum> = {
  container: Container;
  sync(datum: TDatum): void;
  destroy(): void;
};

export type TViewEntry<TDatum> = {
  key: number;
  datum: TDatum;
  x: number;
  y: number;
};

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
