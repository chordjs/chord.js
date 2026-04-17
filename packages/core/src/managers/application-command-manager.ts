import type { ChordClient } from "../structures/chord-client.js";
import { InteractionCommand } from "../pieces/interaction-command.js";
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
   * Syncs all registered interaction commands with Discord.
   * @param guildId Optional guild ID to sync guild-specific commands.
   */
  public async sync(guildId?: Snowflake): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    const store = this.client.store<InteractionCommand>("interaction-commands");
    const localCommands = Array.from(store.values()).map(cmd => cmd.toApplicationCommand());
    
    // Map camelCase to snake_case for the API (if needed)
    const body = localCommands.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      type: cmd.type,
      options: cmd.options,
      name_localizations: cmd.nameLocalizations,
      description_localizations: cmd.descriptionLocalizations
    }));

    const path = guildId 
      ? `/applications/${this.client.applicationId}/guilds/${guildId}/commands`
      : `/applications/${this.client.applicationId}/commands`;

    await this.client.rest.put(path, {
      body: JSON.stringify(body)
    });

    console.log(`✅ Synced ${localCommands.length} commands ${guildId ? `to guild ${guildId}` : "globally"}.`);
  }
}
