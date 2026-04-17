import { BaseManager } from "../structures/manager.js";
import { Channel } from "../structures/channel.js";
import type { Snowflake, Channel as APIChannel } from "@chord.js/types";
import { Routes } from "@chord.js/utils";

/**
 * Manager for Channels.
 */
export class ChannelManager extends BaseManager<Snowflake, Channel> {
  /**
   * Resolves a channel from the cache.
   */
  public resolve(id: Snowflake): Channel | null {
    if (this.client.cache?.channels) {
      const data = this.client.cache.channels.get(id);
      if (data) return new Channel(this.client, data);
    }
    return null;
  }

  /**
   * Fetches a channel from the API.
   */
  public async fetch(id: Snowflake): Promise<Channel> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    const cached = this.resolve(id);
    if (cached) return cached;

    const data = await this.client.rest.get(Routes.channel(id)) as APIChannel;
    const channel = new Channel(this.client, data);

    if (this.client.cache?.channels) {
      this.client.cache.channels.set(id, data);
    }

    return channel;
  }
}
