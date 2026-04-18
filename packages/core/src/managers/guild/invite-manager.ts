import type { Invite as APIInvite, InviteMetadata as APIInviteMetadata, Snowflake } from "@chordjs/types";
import { BaseManager } from "../../structures/manager.js";
import { Invite } from "../../structures/invite.js";
import type { ChordClient } from "../../structures/chord-client.js";

/**
 * Manager for Guild Invites.
 */
export class GuildInviteManager extends BaseManager<string, Invite> {
  public readonly guildId: Snowflake;

  constructor(client: ChordClient, guildId: Snowflake) {
    super(client);
    this.guildId = guildId;
  }

  /**
   * Resolves an invite code into an Invite entity.
   */
  public async resolve(code: string): Promise<Invite | null> {
    try {
      return await this.fetch(code);
    } catch {
      return null;
    }
  }

  /**
   * Fetches an invite by its code.
   */
  public async fetch(code: string): Promise<Invite> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/invites/${code}`) as APIInvite;
    return new Invite(this.client, data);
  }

  /**
   * Fetches all invites in the guild.
   */
  public async fetchAll(): Promise<Invite[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.guildId}/invites`) as APIInviteMetadata[];
    return data.map(i => new Invite(this.client, i));
  }

  /**
   * Creates an invite for a channel.
   */
  public async create(channelId: Snowflake, options?: { 
    max_age?: number, 
    max_uses?: number, 
    temporary?: boolean, 
    unique?: boolean, 
    reason?: string 
  }): Promise<Invite> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options ?? {};
    const data = await this.client.rest.post(`/channels/${channelId}/invites`, {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIInvite;
    return new Invite(this.client, data);
  }
}
