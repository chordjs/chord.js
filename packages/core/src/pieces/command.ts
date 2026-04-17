import { Piece, type PieceContext } from "../structures/piece.js";

export interface CommandContext extends PieceContext {
  description?: string;
  aliases?: string[];
}

export abstract class Command extends Piece {
  public readonly description: string;
  public readonly aliases: string[];

  protected constructor(context: CommandContext) {
    super(context);
    this.description = context.description ?? "";
    this.aliases = context.aliases ?? [];
  }

  abstract run(...args: unknown[]): unknown | Promise<unknown>;
}
