import { Piece, type PieceContext, type PieceOptions } from "../structures/piece.js";

export interface CommandOptions extends PieceOptions {
  description?: string;
  aliases?: string[];
}

export abstract class Command extends Piece {
  public readonly description: string;
  public readonly aliases: string[];

  protected constructor(context: PieceContext, options: CommandOptions = {}) {
    super(context, options);
    this.description = options.description ?? "";
    this.aliases = options.aliases ?? [];
  }

  abstract run(...args: unknown[]): unknown | Promise<unknown>;
}
