import type { Store } from "./store.js";

export interface PieceContext {
  name: string;
  enabled?: boolean;
}

export interface PieceOptions {
  name?: string;
  enabled?: boolean;
}

export abstract class Piece {
  public readonly name: string;
  public enabled: boolean;
  public store: Store<Piece> | null = null;

  protected constructor(context: PieceContext, options: PieceOptions = {}) {
    this.name = options.name ?? context.name;
    this.enabled = options.enabled ?? context.enabled ?? true;
  }

  onLoad?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
}
