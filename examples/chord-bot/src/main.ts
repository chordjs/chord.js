import { ChordClient } from "@chordjs/framework";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new ChordClient({
  prefix: "!",
  ownerIds: ["YOUR_ID_HERE"], // Replace with your ID
  intents: ["Guilds", "GuildMessages", "MessageContent"]
});

// Load all pieces using the new PieceLoader
await client.loader.loadServicesFrom(path.join(__dirname, "services"));
await client.loader.loadCommandsFrom(path.join(__dirname, "commands"));
await client.loader.loadListenersFrom(path.join(__dirname, "listeners"));

client.logger.info("Starting Chord Bot with enterprise architecture...");

await client.login(process.env.DISCORD_TOKEN);
