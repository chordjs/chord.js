import type { Sticker as APISticker, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";

/**
 * Represents a Discord Sticker.
 */
export class Sticker extends BaseEntity {
  public readonly id: Snowflake;
  public readonly packId?: Snowflake;
  public name: string;
  public description: string | null;
  public tags: string;
  public readonly type: number;
  public readonly formatType: number;
  public available?: boolean;
  public readonly guildId?: Snowflake;
  public user?: User;
  public sortValue?: number;

  public constructor(client: ChordClient, data: APISticker) {
    super(client);
    this.id = data.id;
    this.packId = data.pack_id;
    this.name = data.name;
    this.description = data.description;
    this.tags = data.tags;
    this.type = data.type;
    this.formatType = data.format_type;
    this.available = data.available;
    this.guildId = data.guild_id;
    this.user = data.user ? new User(client, data.user) : undefined;
    this.sortValue = data.sort_value;
  }

  /**
   * Edits this sticker. Only for guild stickers.
   */
  public async edit(options: { name?: string, description?: string, tags?: string }): Promise<Sticker> {
    if (!this.guildId) throw new Error("This sticker does not belong to a guild.");
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    const data = await this.client.rest.patch(`/guilds/${this.guildId}/stickers/${this.id}`, {
      body: JSON.stringify(options)
    }) as APISticker;
    
    return new Sticker(this.client, data);
  }

  /**
   * Deletes this sticker. Only for guild stickers.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.guildId) throw new Error("This sticker does not belong to a guild.");
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    await this.client.rest.delete(`/guilds/${this.guildId}/stickers/${this.id}`, {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  public toJSON(): APISticker {
    return {
      id: this.id,
      pack_id: this.packId,
      name: this.name,
      description: this.description,
      tags: this.tags,
      type: this.type,
      format_type: this.formatType,
      available: this.available,
      guild_id: this.guildId,
      user: this.user?.toJSON(),
      sort_value: this.sortValue
    };
  }
}
