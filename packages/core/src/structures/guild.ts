import type { Guild as APIGuild, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { Member } from "./member.js";
import { Channel } from "./channel.js";
import { AuditLog } from "./audit-log.js";
import { Ban } from "./ban.js";
import { Invite } from "./invite.js";
import { AutoModerationRule } from "./auto-moderation-rule.js";
import { StageInstance } from "./stage-instance.js";
import { ScheduledEvent } from "./scheduled-event.js";
import { Sticker } from "./sticker.js";
import { Webhook } from "./webhook.js";
import { SKU } from "./sku.js";
import { Entitlement } from "./entitlement.js";
import type { 
  GuildMember as APIGuildMember, 
  Channel as APIChannel,
  AuditLog as APIAuditLog,
  Ban as APIBan,
  Invite as APIInvite,
  InviteMetadata as APIInviteMetadata,
  AutoModerationRule as APIAutoModerationRule,
  AutoModerationAction,
  StageInstance as APIStageInstance,
  GuildScheduledEvent as APIGuildScheduledEvent,
  Sticker as APISticker,
  Webhook as APIWebhook,
  Entitlement as APIEntitlement
} from "@chordjs/types";

/**
 * Represents a Discord Guild.
 */
export class Guild extends BaseEntity {
  public readonly id: Snowflake;
  public name?: string;
  public ownerId?: Snowflake;
  public memberCount?: number;

  public constructor(client: ChordClient, data: APIGuild) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.ownerId = data.owner_id;
    this.memberCount = data.member_count;
  }

  /**
   * Leaves the guild.
   */
  public async leave(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.userGuild("@me", this.id));
  }

  /**
   * Fetches the members of the guild. (Advanced placeholder)
   */
  public async fetchMembers(): Promise<unknown[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    return this.client.rest.get(Routes.guildMembers(this.id)) as Promise<unknown[]>;
  }

  /**
   * Edits this guild.
   */
  public async edit(options: Record<string, unknown>): Promise<Guild> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(Routes.guild(this.id), {
      body: JSON.stringify(options)
    }) as APIGuild;
    return new Guild(this.client, data);
  }

  /**
   * Deletes this guild. (Must be owner)
   */
  public async delete(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.guild(this.id));
  }

  /**
   * Kicks a member from this guild.
   */
  public async kick(userId: Snowflake, reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.guildMember(this.id, userId), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Bans a user from this guild.
   */
  public async ban(userId: Snowflake, options?: { delete_message_seconds?: number, reason?: string }): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body: Record<string, unknown> = {};
    if (options?.delete_message_seconds !== undefined) {
      body.delete_message_seconds = options.delete_message_seconds;
    }
    await this.client.rest.put(Routes.guildBan(this.id, userId), {
      body: JSON.stringify(body),
      headers: options?.reason ? { "X-Audit-Log-Reason": options.reason } : undefined
    });
  }

  /**
   * Unbans a user from this guild.
   */
  public async unban(userId: Snowflake, reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.guildBan(this.id, userId), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Fetches a specific member from this guild.
   */
  public async fetchMember(userId: Snowflake): Promise<Member> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(Routes.guildMember(this.id, userId)) as APIGuildMember;
    return new Member(this.client, this.id, data);
  }

  /**
   * Fetches all channels in this guild.
   */
  public async fetchChannels(): Promise<Channel[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(Routes.guildChannels(this.id)) as APIChannel[];
    return data.map(c => new Channel(this.client, c));
  }

  /**
   * Fetches audit logs for this guild.
   */
  public async fetchAuditLogs(options?: { user_id?: Snowflake, action_type?: number, before?: Snowflake, limit?: number }): Promise<AuditLog> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const query = options ? new URLSearchParams(options as any).toString() : "";
    const path = `/guilds/${this.id}/audit-logs${query ? `?${query}` : ""}`;
    const data = await this.client.rest.get(path) as APIAuditLog;
    return new AuditLog(this.client, data);
  }

  /**
   * Fetches bans for this guild.
   */
  public async fetchBans(options?: { limit?: number, before?: Snowflake, after?: Snowflake }): Promise<Ban[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const query = options ? new URLSearchParams(options as any).toString() : "";
    const path = `/guilds/${this.id}/bans${query ? `?${query}` : ""}`;
    const data = await this.client.rest.get(path) as APIBan[];
    return data.map(b => new Ban(this.client, b));
  }

  /**
   * Fetches a specific ban for this guild.
   */
  public async fetchBan(userId: Snowflake): Promise<Ban> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.id}/bans/${userId}`) as APIBan;
    return new Ban(this.client, data);
  }

  /**
   * Fetches invites for this guild.
   */
  public async fetchInvites(): Promise<Invite[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.id}/invites`) as APIInviteMetadata[];
    return data.map(i => new Invite(this.client, i));
  }

  /**
   * Creates an invite for a channel in this guild.
   */
  public async createInvite(channelId: Snowflake, options?: { max_age?: number, max_uses?: number, temporary?: boolean, unique?: boolean, reason?: string }): Promise<Invite> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options ?? {};
    const data = await this.client.rest.post(`/channels/${channelId}/invites`, {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIInvite;
    return new Invite(this.client, data);
  }

  /**
   * Fetches all auto moderation rules for this guild.
   */
  public async fetchAutoModerationRules(): Promise<AutoModerationRule[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.id}/auto-moderation/rules`) as APIAutoModerationRule[];
    return data.map(r => new AutoModerationRule(this.client, r));
  }

  /**
   * Fetches a specific auto moderation rule.
   */
  public async fetchAutoModerationRule(ruleId: Snowflake): Promise<AutoModerationRule> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.id}/auto-moderation/rules/${ruleId}`) as APIAutoModerationRule;
    return new AutoModerationRule(this.client, data);
  }

  /**
   * Creates a new auto moderation rule.
   */
  public async createAutoModerationRule(options: {
    name: string,
    event_type: number,
    trigger_type: number,
    trigger_metadata?: any,
    actions: AutoModerationAction[],
    enabled?: boolean,
    exempt_roles?: Snowflake[],
    exempt_channels?: Snowflake[],
    reason?: string
  }): Promise<AutoModerationRule> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options;
    const data = await this.client.rest.post(`/guilds/${this.id}/auto-moderation/rules`, {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIAutoModerationRule;
    return new AutoModerationRule(this.client, data);
  }

  /**
   * Fetches all scheduled events for this guild.
   */
  public async fetchScheduledEvents(withUserCount?: boolean): Promise<ScheduledEvent[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const path = `/guilds/${this.id}/scheduled-events${withUserCount ? "?with_user_count=true" : ""}`;
    const data = await this.client.rest.get(path) as APIGuildScheduledEvent[];
    return data.map(e => new ScheduledEvent(this.client, e));
  }

  /**
   * Fetches a specific scheduled event.
   */
  public async fetchScheduledEvent(eventId: Snowflake, withUserCount?: boolean): Promise<ScheduledEvent> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const path = `/guilds/${this.id}/scheduled-events/${eventId}${withUserCount ? "?with_user_count=true" : ""}`;
    const data = await this.client.rest.get(path) as APIGuildScheduledEvent;
    return new ScheduledEvent(this.client, data);
  }

  /**
   * Creates a new scheduled event.
   */
  public async createScheduledEvent(options: {
    channel_id?: Snowflake,
    entity_metadata?: { location?: string },
    name: string,
    privacy_level: number,
    scheduled_start_time: string,
    scheduled_end_time?: string,
    description?: string,
    entity_type: number,
    image?: string,
    reason?: string
  }): Promise<ScheduledEvent> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options;
    const data = await this.client.rest.post(`/guilds/${this.id}/scheduled-events`, {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIGuildScheduledEvent;
    return new ScheduledEvent(this.client, data);
  }

  /**
   * Fetches the stage instance for a channel.
   */
  public async fetchStageInstance(channelId: Snowflake): Promise<StageInstance> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/stage-instances/${channelId}`) as APIStageInstance;
    return new StageInstance(this.client, data);
  }

  /**
   * Creates a new stage instance.
   */
  public async createStageInstance(options: {
    channel_id: Snowflake,
    topic: string,
    privacy_level?: number,
    send_start_notification?: boolean,
    reason?: string
  }): Promise<StageInstance> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options;
    const data = await this.client.rest.post(`/stage-instances`, {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIStageInstance;
    return new StageInstance(this.client, data);
  }

  /**
   * Fetches all stickers in this guild.
   */
  public async fetchStickers(): Promise<Sticker[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.id}/stickers`) as APISticker[];
    return data.map(s => new Sticker(this.client, s));
  }

  /**
   * Fetches a specific sticker in this guild.
   */
  public async fetchSticker(stickerId: Snowflake): Promise<Sticker> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.id}/stickers/${stickerId}`) as APISticker;
    return new Sticker(this.client, data);
  }

  /**
   * Creates a new sticker in this guild.
   */
  public async createSticker(options: {
    name: string,
    description: string,
    tags: string,
    file: any, // Should be a file or path
    reason?: string
  }): Promise<Sticker> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    // Note: Creating a sticker requires multipart/form-data.
    // Our REST client supports this but we need to handle it properly.
    const { reason, file, ...body } = options;
    const formData = new FormData();
    formData.append("name", body.name);
    formData.append("description", body.description);
    formData.append("tags", body.tags);
    formData.append("file", file);

    const data = await this.client.rest.post(`/guilds/${this.id}/stickers`, {
      body: formData,
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APISticker;
    return new Sticker(this.client, data);
  }

  /**
   * Fetches all webhooks in this guild.
   */
  public async fetchWebhooks(): Promise<Webhook[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.id}/webhooks`) as APIWebhook[];
    return data.map(w => new Webhook(this.client, w));
  }

  /**
   * Fetches entitlements for this guild.
   */
  public async fetchEntitlements(options?: { user_id?: Snowflake, sku_ids?: Snowflake[], before?: Snowflake, after?: Snowflake, limit?: number, exclude_ended?: boolean }): Promise<Entitlement[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const query = new URLSearchParams();
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) query.append(key, Array.isArray(value) ? value.join(",") : String(value));
      }
    }
    const path = `/applications/${this.client.applicationId}/entitlements?guild_id=${this.id}${query.toString() ? `&${query.toString()}` : ""}`;
    const data = await this.client.rest.get(path) as APIEntitlement[];
    return data.map(e => new Entitlement(this.client, e));
  }

  public toJSON(): APIGuild {
    return {
      id: this.id,
      name: this.name,
      owner_id: this.ownerId,
      member_count: this.memberCount
    };
  }
}
