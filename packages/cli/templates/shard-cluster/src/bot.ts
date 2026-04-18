import { ChordClient } from "@chordjs/framework";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The worker receives shard info via process.send or IPC.
// ProcessClusterManager sends an 'init' op.
process.on("message", async (msg: any) => {
  if (msg.op === "init") {
    const { cluster, gateway } = msg.d;
    
    // We create a ChordClient for this specific shard cluster
    const client = new ChordClient({
      ...gateway,
      prefix: "!",
      // Pass the first shard ID of this cluster as the main reference if needed,
      // but ChordClient handles the array of shards in the future.
      // For now, core ChordClient expects [id, total]
      shard: [cluster.shardIds[0], msg.d.shardCount]
    });

    // Load pieces
    await client.loader.loadCommandsFrom(path.join(__dirname, "commands"));
    await client.loader.loadListenersFrom(path.join(__dirname, "listeners"));

    await client.login(gateway.token);
    
    // Notify manager we are ready
    process.send?.({ op: "ready" });
  }
});
