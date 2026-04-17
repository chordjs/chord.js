import { Piece, type PieceContext } from "../structures/piece.js";

export interface ListenerContext extends PieceContext {
  event: string;
  once?: boolean;
}

export abstract class Listener extends Piece {
  public readonly event: string;
  public readonly once: boolean;

  protected constructor(context: ListenerContext) {
    super(context);
    this.event = context.event;
    this.once = context.once ?? false;
  }

  abstract run(...args: unknown[]): unknown | Promise<unknown>;
}
