import { Container, type ContainerChild, type ContainerEvents } from "pixi.js";

type TListener = Parameters<Container["on"]>[1];

type TChildrenMap = Record<string, Container>;
type TEventMap = Record<string, unknown[]>;

export type TNone = Record<never, never>;

type TAllEvents<E extends TEventMap> = ContainerEvents<ContainerChild> & E;
type TEventName<E extends TEventMap> = keyof TAllEvents<E> & (string | symbol);
type TEventArgs<E extends TEventMap, K extends TEventName<E>> = Extract<
  TAllEvents<E>[K],
  unknown[]
>;

export abstract class CContainer<
  TChildren extends TChildrenMap = TNone,
  TEvents extends TEventMap = TNone,
> {
  private readonly _container = new Container();

  getChildByLabel<K extends keyof TChildren & string>(
    label: K,
    deep?: boolean,
  ): TChildren[K];
  getChildByLabel(label: RegExp | string, deep?: boolean): Container | null;
  getChildByLabel(label: RegExp | string, deep?: boolean): Container | null {
    return this._container.getChildByLabel(label, deep);
  }

  on<K extends TEventName<TEvents>>(
    event: K,
    fn: (...args: TEventArgs<TEvents, K>) => void,
    context?: unknown,
  ): this;
  on(event: never, fn: TListener, context?: unknown): this;
  on(event: string | symbol, fn: TListener, context?: unknown): this {
    this._container.on(event, fn, context);
    return this;
  }

  once<K extends TEventName<TEvents>>(
    event: K,
    fn: (...args: TEventArgs<TEvents, K>) => void,
    context?: unknown,
  ): this;
  once(event: never, fn: TListener, context?: unknown): this;
  once(event: string | symbol, fn: TListener, context?: unknown): this {
    this._container.once(event, fn, context);
    return this;
  }

  off<K extends TEventName<TEvents>>(
    event: K,
    fn?: (...args: TEventArgs<TEvents, K>) => void,
    context?: unknown,
    once?: boolean,
  ): this;
  off(event: never, fn?: TListener, context?: unknown, once?: boolean): this;
  off(
    event: string | symbol,
    fn?: TListener,
    context?: unknown,
    once?: boolean,
  ): this {
    this._container.off(event, fn, context, once);
    return this;
  }

  emit<K extends TEventName<TEvents>>(
    event: K,
    ...args: TEventArgs<TEvents, K>
  ): boolean;
  emit(event: never, ...args: unknown[]): boolean;
  emit(event: string | symbol, ...args: unknown[]): boolean {
    return this._container.emit(event, ...args);
  }

  protected addNamedChild<K extends keyof TChildren & string>(
    label: K,
    child: TChildren[K],
  ): TChildren[K] {
    child.label = label;
    return this._container.addChild(child);
  }

  get container(): Container {
    return this._container;
  }
}
