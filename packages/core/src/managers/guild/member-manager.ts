import type { GuildMember as APIGuildMember, Snowflake, Ban as APIBan } from "@chordjs/types";
import { BaseManager } from "../../structures/manager.js";
import { Member } from "../../structures/member.js";
import { Ban } from "../../structures/ban.js";
import { Routes } from "@chordjs/utils";
import type { ChordClient } from "../../structures/chord-client.js";

/**
 * Manager for Guild Members.
 */
export class GuildMemberManager extends BaseManager<Snowflake, Member> {
  public readonly guildId: Snowflake;

  constructor(client: ChordClient, guildId: Snowflake) {
    super(client);
    this.guildId = guildId;
  }

  /**
   * Resolves a member ID into a Member entity.
   */
  public async resolve(id: Snowflake): Promise<Member | null> {
    try {
      return await this.fetch(id);
    } catch {
      return null;
    }
  }

  /**
   * Fetches a member from the guild.
   */
  public async fetch(userId: Snowflake): Promise<Member> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(Routes.guildMember(this.guildId, userId)) as APIGuildMember;
    return new Member(this.client, this.guildId, data);
  }

  /**
   * Kicks a member from the guild.
   */
  public async kick(userId: Snowflake, reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.guildMember(this.guildId, userId), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Bans a user from the guild.
   */
  public async ban(userId: Snowflake, options?: { delete_message_seconds?: number, reason?: string }): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body: Record<string, unknown> = {};
    if (options?.delete_message_seconds !== undefined) {
      body.delete_message_seconds = options.delete_message_seconds;
    }
    await this.client.rest.put(Routes.guildBan(this.guildId, userId), {
      body: JSON.stringify(body),
      headers: options?.reason ? { "X-Audit-Log-Reason": options.reason } : undefined
    });
  }

  /**
   * Unbans a user from the guild.
   */
  public async unban(userId: Snowflake, reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.guildBan(this.guildId, userId), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Fetches all bans for the guild.
   */
  public async fetchBans(options?: { limit?: number, before?: Snowflake, after?: Snowflake }): Promise<Ban[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const query = options ? new URLSearchParams(options as any).toString() : "";
    const path = `/guilds/${this.guildId}/bans${query ? `?${query}` : ""}`;
    const data = await this.client.rest.get(path) as APIBan[];
    return data.map(b => new Ban(this.client, b));
  }

  /**
   * Fetches a specific ban.
   */
  public async fetchBan(userId: Snowflake): Promise<Ban> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.guildId}/bans/${userId}`) as APIBan;
    return new Ban(this.client, data);
  }
}
