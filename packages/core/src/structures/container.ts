export type ContainerToken<T> = symbol & { __type?: T };

export class Container {
  readonly #singletons = new Map<symbol, unknown>();
  readonly #factories = new Map<symbol, () => unknown>();

  public static createToken<T>(description: string): ContainerToken<T> {
    return Symbol(description) as ContainerToken<T>;
  }

  register<T>(token: ContainerToken<T>, value: T): void {
    this.#singletons.set(token, value);
    this.#factories.delete(token);
  }

  registerFactory<T>(token: ContainerToken<T>, factory: () => T): void {
    this.#factories.set(token, factory);
    this.#singletons.delete(token);
  }

  resolve<T>(token: ContainerToken<T>): T {
    if (this.#singletons.has(token)) {
      return this.#singletons.get(token) as T;
    }

    const factory = this.#factories.get(token);
    if (factory) {
      const value = factory() as T;
      this.#singletons.set(token, value);
      this.#factories.delete(token);
      return value;
    }

    throw new Error(`Container: token not registered: ${token.toString()}`);
  }

  has(token: symbol): boolean {
    return this.#singletons.has(token) || this.#factories.has(token);
  }

  unregister(token: symbol): void {
    this.#singletons.delete(token);
    this.#factories.delete(token);
  }

  /**
   * Tries to find a token by its description and resolve it.
   */
  get<T>(description: string): T | undefined {
    for (const token of this.#singletons.keys()) {
      if (token.description === description) return this.#singletons.get(token) as T;
    }
    for (const token of this.#factories.keys()) {
      if (token.description === description) return this.resolve(token as ContainerToken<T>);
    }
    return undefined;
  }
}
