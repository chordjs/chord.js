import type { Channel as APIChannel, Snowflake } from "@chordjs/types";
import { BaseManager } from "../../structures/manager.js";
import { Channel } from "../../structures/channel.js";
import { Routes } from "@chordjs/utils";
import type { ChordClient } from "../../structures/chord-client.js";

/**
 * Manager for Guild Channels.
 */
export class GuildChannelManager extends BaseManager<Snowflake, Channel> {
  public readonly guildId: Snowflake;

  constructor(client: ChordClient, guildId: Snowflake) {
    super(client);
    this.guildId = guildId;
  }

  /**
   * Resolves a channel ID into a Channel entity.
   */
  public async resolve(id: Snowflake): Promise<Channel | null> {
    try {
      const data = await this.client.rest?.get(Routes.channel(id)) as APIChannel;
      if (data.guild_id !== this.guildId) return null;
      return new Channel(this.client, data);
    } catch {
      return null;
    }
  }

  /**
   * Fetches all channels in the guild.
   */
  public async fetchAll(): Promise<Channel[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(Routes.guildChannels(this.guildId)) as APIChannel[];
    return data.map(c => new Channel(this.client, c));
  }

  /**
   * Creates a new channel in the guild.
   */
  public async create(options: { 
    name: string, 
    type?: number, 
    topic?: string, 
    bitrate?: number, 
    user_limit?: number, 
    rate_limit_per_user?: number, 
    position?: number, 
    permission_overwrites?: any[], 
    parent_id?: Snowflake, 
    nsfw?: boolean,
    reason?: string
  }): Promise<Channel> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options;
    const data = await this.client.rest.post(Routes.guildChannels(this.guildId), {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIChannel;
    return new Channel(this.client, data);
  }
}
