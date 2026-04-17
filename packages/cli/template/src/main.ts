import { ChordClient, GatewayClient, RestClient, GatewayIntentBits } from "@chordjs/framework";
import path from "node:path";

/**
 * Chord.js Basic Bot Example
 * 
 * This example demonstrates:
 * 1. Initializing Rest and Gateway clients
 * 2. Using the unified ChordClient
 * 3. Automatically loading commands and listeners using PieceLoader
 * 4. Handling commands with the built-in PrefixCommandRouter
 */

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("❌ DISCORD_TOKEN environment variable is missing!");
    console.log("Please create a .env file based on .env.example and add your bot token.");
    process.exit(1);
  }

  // 1. Initialize core components
  const rest = new RestClient({ token });
  const gateway = new GatewayClient({ 
    token, 
    intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent 
  });

  // 2. Initialize the unified client
  const client = new ChordClient({ rest, gateway });

  // 3. Load pieces (Commands & Listeners) automatically from their respective folders
  console.log("📂 Loading commands and listeners...");
  
  // path.join(import.meta.dirname, "...") is a clean way to point to subdirectories
  await client.loader.loadCommandsFrom(path.join(import.meta.dirname, "commands"));
  await client.loader.loadListenersFrom(path.join(import.meta.dirname, "listeners"));

  // 4. Connect to Discord
  console.log("🔮 Connecting to Gateway...");
  await gateway.connect();
}

main().catch((err) => {
  console.error("💥 Failed to start the bot:", err);
  process.exit(1);
});
