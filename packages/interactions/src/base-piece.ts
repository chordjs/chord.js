import { type Store } from "@chordjs/core";

export interface PieceContext {
  name: string;
  enabled?: boolean;
  [key: string]: any;
}

export interface PieceOptions {
  name?: string;
  enabled?: boolean;
}

export abstract class Piece<TContext extends PieceContext = PieceContext> {
  public readonly name: string;
  public enabled: boolean;
  public pieceStore: Store<any> | null = null;
  public readonly context: TContext;

  protected constructor(context: TContext, options: PieceOptions = {}) {
    this.context = context;
    this.name = options.name ?? context.name;
    this.enabled = options.enabled ?? context.enabled ?? true;
  }

  onLoad?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
}
