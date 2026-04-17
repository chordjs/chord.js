import type { Emoji as APIEmoji, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";

/**
 * Represents a Discord Emoji.
 */
export class Emoji extends BaseEntity {
  public readonly id: Snowflake | null;
  public readonly guildId?: Snowflake;
  public name: string | null;
  public roles?: Snowflake[];
  public user?: any;
  public requireColons?: boolean;
  public managed?: boolean;
  public animated?: boolean;
  public available?: boolean;

  public constructor(client: ChordClient, data: APIEmoji, guildId?: Snowflake) {
    super(client);
    this.id = data.id;
    this.guildId = guildId;
    this.name = data.name;
    this.roles = data.roles;
    this.user = data.user;
    this.requireColons = data.require_colons;
    this.managed = data.managed;
    this.animated = data.animated;
    this.available = data.available;
  }

  /**
   * Edits the emoji.
   */
  public async edit(options: Record<string, unknown>, reason?: string): Promise<Emoji> {
    if (!this.guildId || !this.id) throw new Error("Cannot edit a partial or non-guild emoji.");
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(Routes.guildEmoji(this.guildId, this.id), {
      body: JSON.stringify(options),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIEmoji;
    return new Emoji(this.client, data, this.guildId);
  }

  /**
   * Deletes the emoji.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.guildId || !this.id) throw new Error("Cannot delete a partial or non-guild emoji.");
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.guildEmoji(this.guildId, this.id), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  public toJSON(): APIEmoji {
    return {
      id: this.id,
      name: this.name,
      roles: this.roles,
      user: this.user,
      require_colons: this.requireColons,
      managed: this.managed,
      animated: this.animated,
      available: this.available
    };
  }
}
