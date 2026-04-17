import { BaseManager } from "../structures/manager.js";
import { Guild } from "../structures/guild.js";
import type { Snowflake, Guild as APIGuild } from "@chordjs/types";
import { Routes } from "@chordjs/utils";

/**
 * Manager for Guilds.
 */
export class GuildManager extends BaseManager<Snowflake, Guild> {
  /**
   * Resolves a guild from the cache.
   */
  public resolve(id: Snowflake): Guild | null {
    if (this.client.cache?.guilds) {
      const data = this.client.cache.guilds.get(id);
      if (data) return new Guild(this.client, data);
    }
    return null;
  }

  /**
   * Fetches a guild from the API.
   */
  public async fetch(id: Snowflake): Promise<Guild> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    const cached = this.resolve(id);
    if (cached) return cached;

    const data = await this.client.rest.get(Routes.guild(id)) as APIGuild;
    const guild = new Guild(this.client, data);

    if (this.client.cache?.guilds) {
      this.client.cache.guilds.set(id, data);
    }

    return guild;
  }
}
