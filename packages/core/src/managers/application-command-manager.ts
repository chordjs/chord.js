import type { ChordClient } from "../structures/chord-client.js";
import { Routes } from "@chordjs/utils";
import type { Snowflake } from "@chordjs/types";

/**
 * Manages syncing application commands with Discord.
 */
export class ApplicationCommandManager {
  private readonly client: ChordClient;

  constructor(client: ChordClient) {
    this.client = client;
  }

  /**
   * Syncs commands to Discord.
   * @param commands The raw command payloads to sync.
   * @param guildId Optional guild ID to sync guild-specific commands.
   */
  public async sync(commands: any[], guildId?: Snowflake): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    const path = guildId 
      ? Routes.guildApplicationCommands(this.client.applicationId, guildId)
      : Routes.applicationCommands(this.client.applicationId);

    await this.client.rest.put(path, {
      body: JSON.stringify(commands)
    });

    console.log(`✅ Synced ${commands.length} commands ${guildId ? `to guild ${guildId}` : "globally"}.`);
  }
}
