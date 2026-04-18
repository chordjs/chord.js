import { ChordClient } from "@chordjs/framework";
import { ClusterWorker, type ClusterWorkerInit } from "@chordjs/gateway";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class BotWorker extends ClusterWorker {
  #client: ChordClient | null = null;

  async onInit(data: ClusterWorkerInit): Promise<void> {
    const { cluster, gateway, shardCount } = data;

    // Create a ChordClient for this specific shard cluster
    this.#client = new ChordClient({
      ...gateway,
      prefix: "!",
      // Pass the first shard ID of this cluster as the main reference.
      // ChordClient will handle multiple shards in the future.
      shard: [cluster.shardIds[0], shardCount]
    });

    // Load pieces
    await this.#client.loader.loadCommandsFrom(path.join(__dirname, "commands"));
    await this.#client.loader.loadListenersFrom(path.join(__dirname, "listeners"));
  }

  async onConnectAll(): Promise<void> {
    if (!this.#client) throw new Error("Client not initialized");
    await this.#client.login();
  }
}

// Start the worker
new BotWorker();
