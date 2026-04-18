import type { GuildTemplate as APIGuildTemplate, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";
import { Guild } from "./guild.js";

/**
 * Represents a Discord Guild Template.
 */
export class GuildTemplate extends BaseEntity {
  public readonly code: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly usageCount: number;
  public readonly creatorId: Snowflake;
  public readonly creator: User;
  public readonly createdAt: string;
  public readonly updatedAt: string;
  public readonly sourceGuildId: Snowflake;
  public readonly isDirty: boolean | null;

  constructor(client: ChordClient, data: APIGuildTemplate) {
    super(client);
    this.code = data.code;
    this.name = data.name;
    this.description = data.description;
    this.usageCount = data.usage_count;
    this.creatorId = data.creator_id;
    this.creator = new User(client, data.creator);
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.sourceGuildId = data.source_guild_id;
    this.isDirty = data.is_dirty;
  }

  /**
   * Syncs the template with the current state of the guild.
   */
  public async sync(): Promise<GuildTemplate> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.put(`/guilds/${this.sourceGuildId}/templates/${this.code}`) as APIGuildTemplate;
    return new GuildTemplate(this.client, data);
  }

  /**
   * Edits the template.
   */
  public async edit(options: { name?: string, description?: string }): Promise<GuildTemplate> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(`/guilds/${this.sourceGuildId}/templates/${this.code}`, {
      body: JSON.stringify(options)
    }) as APIGuildTemplate;
    return new GuildTemplate(this.client, data);
  }

  /**
   * Deletes the template.
   */
  public async delete(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(`/guilds/${this.sourceGuildId}/templates/${this.code}`);
  }

  /**
   * Creates a guild from this template.
   * @param name The name of the new guild.
   */
  public async createGuild(name: string): Promise<Guild> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.post(`/guilds/templates/${this.code}`, {
      body: JSON.stringify({ name })
    }) as any;
    return new Guild(this.client, data);
  }

  public toJSON(): APIGuildTemplate {
    return {
      code: this.code,
      name: this.name,
      description: this.description,
      usage_count: this.usageCount,
      creator_id: this.creatorId,
      creator: this.creator.toJSON(),
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      source_guild_id: this.sourceGuildId,
      serialized_source_guild: {},
      is_dirty: this.isDirty
    };
  }
}
