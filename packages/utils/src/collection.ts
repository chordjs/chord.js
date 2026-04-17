export class Collection<K, V> extends Map<K, V> {
  public get size(): number {
    return super.size;
  }

  filter(predicate: (value: V, key: K, collection: this) => unknown): Collection<K, V> {
    const results = new Collection<K, V>();
    for (const [key, val] of this) {
      if (predicate(val, key, this)) {
        results.set(key, val);
      }
    }
    return results;
  }

  find(predicate: (value: V, key: K, collection: this) => unknown): V | undefined {
    for (const [key, val] of this) {
      if (predicate(val, key, this)) {
        return val;
      }
    }
    return undefined;
  }

  map<T>(fn: (value: V, key: K, collection: this) => T): T[] {
    const results: T[] = [];
    for (const [key, val] of this) {
      results.push(fn(val, key, this));
    }
    return results;
  }

  some(predicate: (value: V, key: K, collection: this) => unknown): boolean {
    for (const [key, val] of this) {
      if (predicate(val, key, this)) {
        return true;
      }
    }
    return false;
  }

  every(predicate: (value: V, key: K, collection: this) => unknown): boolean {
    for (const [key, val] of this) {
      if (!predicate(val, key, this)) {
        return false;
      }
    }
    return true;
  }

  reduce<T>(fn: (accumulator: T, value: V, key: K, collection: this) => T, initialValue: T): T {
    let accumulator = initialValue;
    for (const [key, val] of this) {
      accumulator = fn(accumulator, val, key, this);
    }
    return accumulator;
  }

  first(): V | undefined {
    return this.values().next().value;
  }

  last(): V | undefined {
    const arr = Array.from(this.values());
    return arr[arr.length - 1];
  }

  sort(compareFunction: (a: V, b: V, aKey: K, bKey: K) => number = (a, b) => (a === b ? 0 : a > b ? 1 : -1)): this {
    const entries = Array.from(this.entries());
    entries.sort((a, b) => compareFunction(a[1], b[1], a[0], b[0]));
    
    this.clear();
    for (const [k, v] of entries) {
      this.set(k, v);
    }
    return this;
  }

  clone(): Collection<K, V> {
    return new Collection<K, V>(this);
  }
}
