import type { ChordClient } from "./chord-client.js";
import type { BaseEntity } from "./entity.js";

/**
 * Base class for all data managers (UserManager, GuildManager, etc.)
 */
export abstract class BaseManager<TKey, TEntity extends BaseEntity> {
  public constructor(public readonly client: ChordClient) {}

  /**
   * Resolves a key into an entity, potentially fetching from cache.
   */
  public abstract resolve(id: TKey): TEntity | null | Promise<TEntity | null>;
}
