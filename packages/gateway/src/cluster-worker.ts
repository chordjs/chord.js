import type { ClusterWorkerCommand, ClusterWorkerEvent, ClusterWorkerInit } from "./process-clustering.js";
import { ShardManager } from "./sharding.js";

let shards: ShardManager | null = null;
let initialized = false;

function send(event: ClusterWorkerEvent): void {
  process.send?.(event);
}

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string): void {
  send({ op: "log", level, message });
}

async function init(data: ClusterWorkerInit): Promise<void> {
  if (initialized) return;
  initialized = true;

  shards = new ShardManager({
    shardCount: data.shardCount,
    shardIds: data.cluster.shardIds,
    gateway: data.gateway,
    identify: data.identify,
    spawnDelayMs: data.spawnDelayMs
  });

  log("info", `cluster ${data.cluster.id} ready shards=${data.cluster.shardIds.join(",")}`);
  send({ op: "ready" });
}

process.on("message", async (msg: unknown) => {
  const cmd = msg as Partial<ClusterWorkerCommand> | undefined;
  if (!cmd || typeof cmd.op !== "string") return;

  try {
    switch (cmd.op) {
      case "init":
        if (!cmd.d) throw new Error("init missing payload");
        await init(cmd.d as ClusterWorkerInit);
        return;
      case "connectAll":
        if (!shards) throw new Error("worker not initialized");
        await shards.connectAll();
        return;
      case "closeAll":
        shards?.closeAll(cmd.d?.code, cmd.d?.reason);
        return;
      case "ping":
        if (typeof cmd.nonce === "number") send({ op: "pong", nonce: cmd.nonce });
        return;
      default:
        return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send({ op: "error", message });
  }
});

