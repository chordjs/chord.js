import { Collection } from "@chordjs/utils";

export interface BaseCacheOptions {
  maxSize?: number;
}

export class BaseCache<K, V> extends Collection<K, V> {
  public maxSize: number;

  constructor(options?: BaseCacheOptions) {
    super();
    this.maxSize = options?.maxSize ?? Infinity;
  }

  set(key: K, value: V): this {
    super.set(key, value);
    if (this.size > this.maxSize) {
      const first = this.keys().next().value;
      if (first !== undefined) {
        this.delete(first);
      }
    }
    return this;
  }
}
