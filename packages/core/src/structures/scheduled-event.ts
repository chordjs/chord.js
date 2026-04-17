import type { GuildScheduledEvent as APIGuildScheduledEvent, Snowflake, User as APIUser } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";

/**
 * Represents a Discord Guild Scheduled Event.
 */
export class ScheduledEvent extends BaseEntity {
  public readonly id: Snowflake;
  public readonly guildId: Snowflake;
  public channelId: Snowflake | null;
  public readonly creatorId?: Snowflake | null;
  public name: string;
  public description?: string | null;
  public scheduledStartTime: string;
  public scheduledEndTime: string | null;
  public privacyLevel: number;
  public status: number;
  public entityType: number;
  public entityId: Snowflake | null;
  public entityMetadata: any | null;
  public creator?: User;
  public userCount?: number;
  public image?: string | null;

  public constructor(client: ChordClient, data: APIGuildScheduledEvent) {
    super(client);
    this.id = data.id;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    this.creatorId = data.creator_id;
    this.name = data.name;
    this.description = data.description;
    this.scheduledStartTime = data.scheduled_start_time;
    this.scheduledEndTime = data.scheduled_end_time;
    this.privacyLevel = data.privacy_level;
    this.status = data.status;
    this.entityType = data.entity_type;
    this.entityId = data.entity_id;
    this.entityMetadata = data.entity_metadata;
    this.creator = data.creator ? new User(client, data.creator) : undefined;
    this.userCount = data.user_count;
    this.image = data.image;
  }

  /**
   * Edits this scheduled event.
   */
  public async edit(options: Partial<Pick<APIGuildScheduledEvent, "name" | "description" | "channel_id" | "scheduled_start_time" | "scheduled_end_time" | "status" | "entity_type" | "entity_metadata" | "privacy_level" | "image">>): Promise<ScheduledEvent> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(`/guilds/${this.guildId}/scheduled-events/${this.id}`, {
      body: JSON.stringify(options)
    }) as APIGuildScheduledEvent;
    return new ScheduledEvent(this.client, data);
  }

  /**
   * Deletes this scheduled event.
   */
  public async delete(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(`/guilds/${this.guildId}/scheduled-events/${this.id}`);
  }

  public toJSON(): APIGuildScheduledEvent {
    return {
      id: this.id,
      guild_id: this.guildId,
      channel_id: this.channelId,
      creator_id: this.creatorId,
      name: this.name,
      description: this.description,
      scheduled_start_time: this.scheduledStartTime,
      scheduled_end_time: this.scheduledEndTime,
      privacy_level: this.privacyLevel,
      status: this.status,
      entity_type: this.entityType,
      entity_id: this.entityId,
      entity_metadata: this.entityMetadata,
      creator: this.creator?.toJSON(),
      user_count: this.userCount,
      image: this.image
    };
  }
}
