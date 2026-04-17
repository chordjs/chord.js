import { ChordClient } from "@chordjs/framework";
import { InteractionCommandRouter } from "@chordjs/core";
import path from "node:path";

const client = new ChordClient();

// Register routers
client.container.resolve(InteractionCommandRouter).options.autoSync = true;

async function start() {
  // Load pieces (commands, listeners)
  await client.loader.loadCommandsFrom(path.join(import.meta.dirname, "commands"));
  await client.loader.loadListenersFrom(path.join(import.meta.dirname, "listeners"));

  console.log("🎵 Music Bot is starting...");
  
  // In a real scenario, you would call:
  // await client.gateway.connect(process.env.DISCORD_TOKEN);
}

start().catch(console.error);
