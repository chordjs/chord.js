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
import type { 
  GuildMember as APIGuildMember, 
  Channel as APIChannel,
  AuditLog as APIAuditLog,
  Ban as APIBan,
  Invite as APIInvite,
  InviteMetadata as APIInviteMetadata,
  AutoModerationRule as APIAutoModerationRule,
  AutoModerationAction
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

  public toJSON(): APIGuild {
    return {
      id: this.id,
      name: this.name,
      owner_id: this.ownerId,
      member_count: this.memberCount
    };
  }
}
