import type { Store } from "./store.js";

export interface PieceContext {
  name: string;
  enabled?: boolean;
}

export abstract class Piece {
  public readonly name: string;
  public enabled: boolean;
  public store: Store<Piece> | null = null;

  protected constructor(context: PieceContext) {
    this.name = context.name;
    this.enabled = context.enabled ?? true;
  }

  onLoad?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
}
