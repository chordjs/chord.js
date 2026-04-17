import { ChordClient, GatewayIntentBits } from "@chordjs/framework";
import path from "node:path";

/**
 * Chord.js Basic Bot Example
 * 
 * This example demonstrates:
 * 1. Using the unified ChordClient to abstract Rest and Gateway
 * 2. Automatically loading commands and listeners using PieceLoader
 * 3. Handling commands easily with built-in prefix routing
 */

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("❌ DISCORD_TOKEN environment variable is missing!");
    console.log("Please create a .env file based on .env.example and add your bot token.");
    process.exit(1);
  }

  // 1. Initialize the unified client
  const client = new ChordClient({
    token,
    intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
    prefix: "!" // 자동으로 PrefixCommandRouter를 설정합니다
  });

  // 2. Load pieces (Commands & Listeners) automatically from their respective folders
  console.log("📂 Loading commands and listeners...");
  
  await client.loader.loadCommandsFrom(path.join(import.meta.dirname, "commands"));
  await client.loader.loadListenersFrom(path.join(import.meta.dirname, "listeners"));

  // 3. Connect to Discord
  console.log("🔮 Connecting to Gateway...");
  await client.gateway!.connect();
}

main().catch((err) => {
  console.error("💥 Failed to start the bot:", err);
  process.exit(1);
});
