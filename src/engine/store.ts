type TListener<TState, TEvent> = (
  state: TState,
  event: TEvent | undefined,
) => void;

export class CStore<TState, TEvent = never> {
  private readonly listeners = new Set<TListener<TState, TEvent>>();

  constructor(protected _state: TState) {}

  get state(): Readonly<TState> {
    return this._state;
  }

  subscribe(listener: TListener<TState, TEvent>) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected notify(event?: TEvent) {
    for (const listener of [...this.listeners]) {
      listener(this._state, event);
    }
  }
}
