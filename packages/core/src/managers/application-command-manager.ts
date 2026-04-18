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

  /**
   * Syncs commands only if there are changes.
   */
  public async smartSync(commands: any[], guildId?: Snowflake): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");

    const path = guildId 
      ? Routes.guildApplicationCommands(this.client.applicationId, guildId)
      : Routes.applicationCommands(this.client.applicationId);

    // Fetch existing commands
    const existingCommands = await this.client.rest.get(path) as any[];

    // Simple comparison logic
    const needsSync = existingCommands.length !== commands.length || 
      commands.some(cmd => {
        const existing = existingCommands.find(e => e.name === cmd.name && e.type === (cmd.type ?? 1));
        if (!existing) return true;
        
        // Check for basic differences
        if (existing.description !== (cmd.description ?? "")) return true;
        
        // Deep compare options (stringified for simplicity)
        const existingOptions = JSON.stringify(existing.options ?? []);
        const newOptions = JSON.stringify(cmd.options ?? []);
        if (existingOptions !== newOptions) return true;

        return false;
      });

    if (needsSync) {
      await this.sync(commands, guildId);
    } else {
      console.log(`ℹ️ Commands are already up to date ${guildId ? `for guild ${guildId}` : "globally"}.`);
    }
  }
}
