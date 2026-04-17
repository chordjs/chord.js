import { ChordClient } from "@chordjs/framework";
import path from "node:path";

async function start() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("❌ DISCORD_TOKEN is missing!");
    process.exit(1);
  }

  // Initialize the unified client
  const client = new ChordClient({
    token,
    intents: 32767 // All intents for music bot (Voice, Guilds, Messages, etc)
  });

  // Load pieces (commands, listeners)
  await client.loader.loadCommandsFrom(path.join(import.meta.dirname, "commands"));
  await client.loader.loadListenersFrom(path.join(import.meta.dirname, "listeners"));

  console.log("🎵 Music Bot is starting...");
  
  if (client.gateway) {
    await client.gateway.connect();
  }
}

start().catch(console.error);
