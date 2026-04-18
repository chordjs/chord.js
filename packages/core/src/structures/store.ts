import type { ChordClient } from "./chord-client.js";

/**
 * A generic store for entities.
 */
export class Store<T> {
  public readonly name: string;
  public readonly client: ChordClient;
  readonly #items = new Map<string, T>();

  constructor(client: ChordClient, name: string) {
    this.client = client;
    this.name = name;
  }

  get size(): number {
    return this.#items.size;
  }

  values(): IterableIterator<T> {
    return this.#items.values();
  }

  keys(): IterableIterator<string> {
    return this.#items.keys();
  }

  entries(): IterableIterator<[string, T]> {
    return this.#items.entries();
  }

  [Symbol.iterator](): IterableIterator<[string, T]> {
    return this.#items[Symbol.iterator]();
  }

  has(key: string): boolean {
    return this.#items.has(key);
  }

  get(key: string): T | undefined {
    return this.#items.get(key);
  }

  set(key: string, value: T): void {
    this.#items.set(key, value);
  }

  delete(key: string): boolean {
    return this.#items.delete(key);
  }

  clear(): void {
    this.#items.clear();
  }
}
