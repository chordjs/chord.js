import type { Guild as APIGuild, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { Member } from "./member.js";
import { Channel } from "./channel.js";
import type { GuildMember as APIGuildMember, Channel as APIChannel } from "@chordjs/types";

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

  public toJSON(): APIGuild {
    return {
      id: this.id,
      name: this.name,
      owner_id: this.ownerId,
      member_count: this.memberCount
    };
  }
}
