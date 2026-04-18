export class Emitter<TEvents extends Record<string, (...args: any[]) => any>> {
  readonly #listeners = new Map<keyof TEvents, Set<Function>>();

  on<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    const set = this.#listeners.get(event) ?? new Set();
    set.add(listener as unknown as Function);
    this.#listeners.set(event, set);
  }

  off<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    set.delete(listener as unknown as Function);
    if (set.size === 0) this.#listeners.delete(event);
  }

  once<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    const wrapped = ((...args: any[]) => {
      this.off(event, wrapped as unknown as TEvents[K]);
      (listener as any)(...args);
    }) as unknown as TEvents[K];
    this.on(event, wrapped);
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.#listeners.delete(event);
    } else {
      this.#listeners.clear();
    }
  }

  emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const fn of set) (fn as any)(...args);
  }

  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.#listeners.get(event)?.size ?? 0;
  }
}
