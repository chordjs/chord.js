import { Piece, type PieceContext, type PieceOptions } from "../structures/piece.js";

export interface ListenerOptions<T extends string = string> extends PieceOptions {
  event: T;
  once?: boolean;
}

export abstract class Listener<T extends string = string> extends Piece {
  public readonly event: T;
  public readonly once: boolean;

  protected constructor(context: PieceContext, options: ListenerOptions<T>) {
    super(context, options);
    this.event = options.event;
    this.once = options.once ?? false;
  }

  abstract run(...args: any[]): unknown | Promise<unknown>;
}
