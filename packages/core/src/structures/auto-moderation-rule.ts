import type { AutoModerationRule as APIAutoModerationRule, AutoModerationAction, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";

/**
 * Represents a Discord Auto Moderation Rule.
 */
export class AutoModerationRule extends BaseEntity {
  public readonly id: Snowflake;
  public readonly guildId: Snowflake;
  public name: string;
  public readonly creatorId: Snowflake;
  public eventType: number;
  public triggerType: number;
  public triggerMetadata: any;
  public actions: AutoModerationAction[];
  public enabled: boolean;
  public exemptRoles: Snowflake[];
  public exemptChannels: Snowflake[];

  public constructor(client: ChordClient, data: APIAutoModerationRule) {
    super(client);
    this.id = data.id;
    this.guildId = data.guild_id;
    this.name = data.name;
    this.creatorId = data.creator_id;
    this.eventType = data.event_type;
    this.triggerType = data.trigger_type;
    this.triggerMetadata = data.trigger_metadata;
    this.actions = data.actions;
    this.enabled = data.enabled;
    this.exemptRoles = data.exempt_roles;
    this.exemptChannels = data.exempt_channels;
  }

  /**
   * Edits this auto moderation rule.
   */
  public async edit(options: Partial<Pick<this, "name" | "eventType" | "triggerMetadata" | "actions" | "enabled" | "exemptRoles" | "exemptChannels">>): Promise<AutoModerationRule> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    // Map camelCase to snake_case for the API
    const body: any = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.eventType !== undefined) body.event_type = options.eventType;
    if (options.triggerMetadata !== undefined) body.trigger_metadata = options.triggerMetadata;
    if (options.actions !== undefined) body.actions = options.actions;
    if (options.enabled !== undefined) body.enabled = options.enabled;
    if (options.exemptRoles !== undefined) body.exempt_roles = options.exemptRoles;
    if (options.exemptChannels !== undefined) body.exempt_channels = options.exemptChannels;

    const data = await this.client.rest.patch(`/guilds/${this.guildId}/auto-moderation/rules/${this.id}`, {
      body: JSON.stringify(body)
    }) as APIAutoModerationRule;
    
    return new AutoModerationRule(this.client, data);
  }

  /**
   * Deletes this auto moderation rule.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(`/guilds/${this.guildId}/auto-moderation/rules/${this.id}`, {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  public toJSON(): APIAutoModerationRule {
    return {
      id: this.id,
      guild_id: this.guildId,
      name: this.name,
      creator_id: this.creatorId,
      event_type: this.eventType,
      trigger_type: this.triggerType,
      trigger_metadata: this.triggerMetadata,
      actions: this.actions,
      enabled: this.enabled,
      exempt_roles: this.exemptRoles,
      exempt_channels: this.exemptChannels
    };
  }
}
