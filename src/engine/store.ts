type TListener<TState> = (state: TState) => void;

/**
 * Minimal observable state container: one owned value plus listeners that fire
 * after every change.
 *
 * Game-agnostic and free of pixi. Subclasses own the state type and expose one
 * method per action, mutating the state and then calling `notify`. Views
 * subscribe and re-render from the state they are handed, so no view ever has
 * to keep a copy of the data it draws.
 */
export class CStore<TState> {
  private readonly listeners = new Set<TListener<TState>>();

  constructor(protected _state: TState) {}

  /**
   * The current state. `Readonly` is a reminder, not a guarantee — it does not
   * reach inside nested maps or arrays, so treat everything here as read-only
   * and go through an action to change anything.
   */
  get state(): Readonly<TState> {
    return this._state;
  }

  /** Returns an unsubscribe function. */
  subscribe(listener: TListener<TState>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Iterating a snapshot rather than the live set fixes the audience for a
   * notification at the moment it starts: a listener that unsubscribes partway
   * through still receives this one, and a listener that subscribes partway
   * through waits for the next. Not a guard against mutating a `Set` mid-loop —
   * that is already safe — but a guarantee that one change reaches one
   * consistent set of views.
   */
  protected notify() {
    for (const listener of [...this.listeners]) {
      listener(this._state);
    }
  }
}
