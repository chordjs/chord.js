import type { ChordClient } from "./chord-client.js";

/**
 * Base class for all high-level entities (User, Guild, Channel, etc.)
 */
export abstract class BaseEntity {
  public constructor(public readonly client: ChordClient) {}

  /**
   * Returns a JSON representation of the entity.
   */
  public abstract toJSON(): any;
}
