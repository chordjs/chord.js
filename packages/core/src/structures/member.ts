import type { GuildMember as APIGuildMember, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { User } from "./user.js";

/**
 * Represents a Discord Guild Member.
 */
export class Member extends BaseEntity {
  public readonly user?: User;
  public readonly nick: string | null;
  public readonly roles: Snowflake[];
  public readonly guildId: Snowflake;

  public constructor(client: ChordClient, guildId: Snowflake, data: APIGuildMember) {
    super(client);
    this.guildId = guildId;
    this.user = data.user ? new User(client, data.user) : undefined;
    this.nick = data.nick ?? null;
    this.roles = data.roles;
  }

  /**
   * Voice state management for this member.
   */
  public get voice() {
    return {
      /**
       * Mutes or unmutes the member.
       */
      setMute: async (mute: boolean, reason?: string) => {
        if (!this.user) throw new Error("Cannot mute a member with no user data.");
        await this.edit({ mute }, reason);
      },
      /**
       * Deafens or undeafens the member.
       */
      setDeaf: async (deaf: boolean, reason?: string) => {
        if (!this.user) throw new Error("Cannot deafen a member with no user data.");
        await this.edit({ deaf }, reason);
      },
      /**
       * Moves the member to a different voice channel.
       */
      setChannel: async (channelId: Snowflake | null, reason?: string) => {
        if (!this.user) throw new Error("Cannot move a member with no user data.");
        await this.edit({ channel_id: channelId }, reason);
      },
      /**
       * Disconnects the member from voice.
       */
      disconnect: async (reason?: string) => {
        await this.voice.setChannel(null, reason);
      }
    };
  }

  /**
   * The display name of the member.
   */
  public get displayName(): string {
    return this.nick ?? this.user?.username ?? "Unknown Member";
  }

  /**
   * Edits the member.
   */
  public async edit(options: Record<string, unknown>, reason?: string): Promise<Member> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    if (!this.user) throw new Error("Cannot edit a member with no user data.");
    const data = await this.client.rest.patch(Routes.guildMember(this.guildId, this.user.id), {
      body: JSON.stringify(options),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIGuildMember;
    return new Member(this.client, this.guildId, data);
  }

  /**
   * Kicks the member from the guild.
   */
  public async kick(reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    if (!this.user) throw new Error("Cannot kick a member with no user data.");
    await this.client.rest.delete(Routes.guildMember(this.guildId, this.user.id), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Bans the member from the guild.
   */
  public async ban(options: { deleteMessageSeconds?: number; reason?: string } = {}): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    if (!this.user) throw new Error("Cannot ban a member with no user data.");
    const body: Record<string, unknown> = {};
    if (options.deleteMessageSeconds !== undefined) {
      body.delete_message_seconds = options.deleteMessageSeconds;
    }
    await this.client.rest.put(Routes.guildBan(this.guildId, this.user.id), {
      body: JSON.stringify(body),
      headers: options.reason ? { "X-Audit-Log-Reason": options.reason } : undefined
    });
  }

  /**
   * Applies a timeout to the member.
   */
  public async timeout(until: Date | number | null, reason?: string): Promise<Member> {
    const timestamp = until instanceof Date ? until.toISOString() : (typeof until === 'number' ? new Date(until).toISOString() : null);
    return this.edit({ communication_disabled_until: timestamp }, reason);
  }

  /**
   * Adds a role to the member.
   */
  public async addRole(roleId: Snowflake, reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    if (!this.user) throw new Error("Cannot add role to a member with no user data.");
    await this.client.rest.put(Routes.guildMemberRole(this.guildId, this.user.id, roleId), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Removes a role from the member.
   */
  public async removeRole(roleId: Snowflake, reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    if (!this.user) throw new Error("Cannot remove role from a member with no user data.");
    await this.client.rest.delete(Routes.guildMemberRole(this.guildId, this.user.id, roleId), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  public toJSON(): APIGuildMember {
    return {
      user: this.user?.toJSON(),
      nick: this.nick,
      roles: this.roles,
      joined_at: new Date().toISOString(), // Fallback
      deaf: false,
      mute: false
    };
  }
}
