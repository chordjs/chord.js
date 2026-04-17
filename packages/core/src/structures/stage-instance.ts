import type { StageInstance as APIStageInstance, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";

/**
 * Represents a Discord Stage Instance.
 */
export class StageInstance extends BaseEntity {
  public readonly id: Snowflake;
  public readonly guildId: Snowflake;
  public readonly channelId: Snowflake;
  public topic: string;
  public privacyLevel: number;
  public discoverableDisabled: boolean;
  public guildScheduledEventId: Snowflake | null;

  public constructor(client: ChordClient, data: APIStageInstance) {
    super(client);
    this.id = data.id;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    this.topic = data.topic;
    this.privacyLevel = data.privacy_level;
    this.discoverableDisabled = data.discoverable_disabled;
    this.guildScheduledEventId = data.guild_scheduled_event_id;
  }

  /**
   * Edits this stage instance.
   */
  public async edit(options: { topic?: string, privacyLevel?: number }): Promise<StageInstance> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body: any = {};
    if (options.topic !== undefined) body.topic = options.topic;
    if (options.privacyLevel !== undefined) body.privacy_level = options.privacyLevel;

    const data = await this.client.rest.patch(`/stage-instances/${this.channelId}`, {
      body: JSON.stringify(body)
    }) as APIStageInstance;
    
    return new StageInstance(this.client, data);
  }

  /**
   * Deletes (ends) this stage instance.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(`/stage-instances/${this.channelId}`, {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  public toJSON(): APIStageInstance {
    return {
      id: this.id,
      guild_id: this.guildId,
      channel_id: this.channelId,
      topic: this.topic,
      privacy_level: this.privacyLevel,
      discoverable_disabled: this.discoverableDisabled,
      guild_scheduled_event_id: this.guildScheduledEventId
    };
  }
}
