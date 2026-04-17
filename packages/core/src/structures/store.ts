import type { ChordClient } from "./chord-client.js";
import { Piece } from "./piece.js";

export class Store<TPiece extends Piece> {
  public readonly name: string;
  public readonly client: ChordClient;
  readonly #items = new Map<string, TPiece>();

  constructor(client: ChordClient, name: string) {
    this.client = client;
    this.name = name;
  }

  get size(): number {
    return this.#items.size;
  }

  values(): IterableIterator<TPiece> {
    return this.#items.values();
  }

  keys(): IterableIterator<string> {
    return this.#items.keys();
  }

  entries(): IterableIterator<[string, TPiece]> {
    return this.#items.entries();
  }

  [Symbol.iterator](): IterableIterator<[string, TPiece]> {
    return this.#items[Symbol.iterator]();
  }

  has(name: string): boolean {
    return this.#items.has(name);
  }

  get(name: string): TPiece | undefined {
    return this.#items.get(name);
  }

  async set(piece: TPiece): Promise<TPiece> {
    piece.store = this as unknown as Store<Piece>;
    this.#items.set(piece.name, piece);
    await piece.onLoad?.();
    return piece;
  }

  async delete(name: string): Promise<boolean> {
    const piece = this.#items.get(name);
    if (!piece) return false;
    await piece.onUnload?.();
    piece.store = null;
    return this.#items.delete(name);
  }

  async reload(name: string): Promise<boolean> {
    const piece = this.#items.get(name);
    if (!piece) return false;
    await piece.onUnload?.();
    await piece.onLoad?.();
    return true;
  }
}
