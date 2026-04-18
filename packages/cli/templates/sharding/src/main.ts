import { ChordClient } from "@chordjs/framework";
import { ShardManager } from "@chordjs/gateway";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error("DISCORD_TOKEN is not set");

  // Create a ShardManager to manage multiple shards in the same process
  const manager = await ShardManager.create({
    shardCount: "auto",
    autoShardCount: { token },
    gateway: {
      token,
      intents: ["Guilds", "GuildMessages", "MessageContent"]
    }
  });

  console.log(`[Sharding] Initializing ${manager.shardCount} shards...`);

  for (const shardId of manager.shardIds) {
    const shard = manager.shard(shardId);
    
    // Create a ChordClient for each shard
    const client = new ChordClient({
      prefix: "!",
      gateway: shard.client as any,
    });

    // Load pieces for this shard
    await client.loader.loadServicesFrom(path.join(__dirname, "services"));
    await client.loader.loadCommandsFrom(path.join(__dirname, "commands"));
    await client.loader.loadListenersFrom(path.join(__dirname, "listeners"));

    client.logger.info(`Shard ${shardId} ready to connect.`);
  }

  // Connect all shards to Discord
  await manager.connectAll();
}

main().catch(console.error);
