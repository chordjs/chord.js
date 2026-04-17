import type { Entitlement as APIEntitlement, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";

/**
 * Represents a Discord Entitlement.
 */
export class Entitlement extends BaseEntity {
  public readonly id: Snowflake;
  public readonly skuId: Snowflake;
  public readonly applicationId: Snowflake;
  public readonly userId?: Snowflake;
  public readonly guildId?: Snowflake;
  public readonly type: number;
  public readonly deleted: boolean;
  public readonly startsAt?: string;
  public readonly endsAt?: string;

  public constructor(client: ChordClient, data: APIEntitlement) {
    super(client);
    this.id = data.id;
    this.skuId = data.sku_id;
    this.applicationId = data.application_id;
    this.userId = data.user_id;
    this.guildId = data.guild_id;
    this.type = data.type;
    this.deleted = data.deleted;
    this.startsAt = data.starts_at;
    this.endsAt = data.ends_at;
  }

  /**
   * Checks if this entitlement is currently active.
   */
  public get isActive(): boolean {
    if (this.deleted) return false;
    if (!this.endsAt) return true;
    return new Date(this.endsAt) > new Date();
  }

  public toJSON(): APIEntitlement {
    return {
      id: this.id,
      sku_id: this.skuId,
      application_id: this.applicationId,
      user_id: this.userId,
      guild_id: this.guildId,
      type: this.type,
      deleted: this.deleted,
      starts_at: this.startsAt,
      ends_at: this.endsAt
    };
  }
}
