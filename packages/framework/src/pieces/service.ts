import { Piece, type PieceContext, type PieceOptions } from "@chordjs/interactions";
import type { ChordClient } from "../structures/chord-client.js";

export interface ServiceContext extends PieceContext {
  client: ChordClient;
}

export interface ServiceOptions extends PieceOptions {}

/**
 * Represents a reusable service that can be injected into other pieces.
 */
export abstract class Service<TContext extends ServiceContext = ServiceContext> extends Piece<TContext> {
  constructor(context: TContext, options: ServiceOptions = {}) {
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
