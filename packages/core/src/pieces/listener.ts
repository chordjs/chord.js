import { Piece, type PieceContext } from "../structures/piece.js";

export interface ListenerContext extends PieceContext {
  event: string;
  once?: boolean;
}

export abstract class Listener<T extends string = string> extends Piece {
  public readonly event: T;
  public readonly once: boolean;

  protected constructor(context: ListenerContext & { event: T }) {
    super(context);
    this.event = context.event;
    this.once = context.once ?? false;
  }

  abstract run(...args: any[]): unknown | Promise<unknown>;
}
