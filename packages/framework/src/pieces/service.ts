import { Piece, type PieceContext, type PieceOptions } from "@chordjs/interactions";

export interface ServiceOptions extends PieceOptions {}

/**
 * Represents a reusable service that can be injected into other pieces.
 */
export abstract class Service extends Piece {
  constructor(context: PieceContext, options: ServiceOptions = {}) {
    super(context, options);
  }

  /**
   * Called when the service is started.
   */
  public abstract start(): Promise<void>;

  /**
   * Called when the service is stopped.
   */
  public abstract stop(): Promise<void>;
}
