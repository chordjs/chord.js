import { ProcessClusterManager } from "@chordjs/gateway";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const manager = await ProcessClusterManager.create({
    shardCount: "auto",
    clusters: 2, // Number of processes to spawn
    workerPath: path.join(__dirname, `bot.${import.meta.url.endsWith('.ts') ? 'ts' : 'js'}`),
    gateway: {
      token: process.env.DISCORD_TOKEN!,
      intents: ["Guilds", "GuildMessages", "MessageContent"]
    }
  });

  manager.on("ready", ({ clusterId }) => {
    console.log(`[Manager] Cluster ${clusterId} is ready!`);
  });

  manager.on("log", ({ clusterId, level, message }) => {
    console.log(`[Cluster ${clusterId}] [${level.toUpperCase()}] ${message}`);
  });

  manager.on("error", ({ clusterId, message }) => {
    console.error(`[Cluster ${clusterId}] ERROR: ${message}`);
  });

  console.log("[Manager] Starting shard clusters...");
  await manager.connectAll();
}

main().catch(console.error);
