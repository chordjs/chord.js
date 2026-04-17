import {
  ChordClient,
  cooldown,
  GatewayListenerBinder,
  guildOnly,
  Listener,
  ownerOnly,
  PieceLoader,
  PrefixCommandRouter,
  type PrefixCommandContext,
  type PrefixMessageLike,
  type PrefixReplyPayload
} from "@chordjs/core";
import {
  ClusterManager,
  GatewayClient,
  ProcessClusterManager,
  resolveShardCount,
  ShardManager,
  splitShardsIntoClusters
} from "@chordjs/gateway";
import { RestClient } from "@chordjs/rest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

type Mode = "single" | "shard" | "cluster" | "process" | "cluster-distributed";
type ShardCountInput = number | "auto";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? "");
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseShardCount(value: string | undefined, fallback: number): ShardCountInput {
  if (value === "auto") return "auto";
  return parsePositiveInt(value, fallback);
}

function normalizeReplyBody(payload: string | PrefixReplyPayload): PrefixReplyPayload {
  return typeof payload === "string" ? { content: payload } : payload;
}

function createPrefixReply(rest: RestClient) {
  return async (message: PrefixMessageLike, payload: string | PrefixReplyPayload): Promise<void> => {
    const channelId = message.channel_id ?? message.channelId;
    if (!channelId) return;

    await rest.request("POST", `/channels/${channelId}/messages`, {
      body: JSON.stringify(normalizeReplyBody(payload))
    });
  };
}

function parseOwnerIds(input: string | undefined): string[] {
  if (!input) return [];
  return input.split(",").map((v) => v.trim()).filter(Boolean);
}

function parseNumberList(input: string | undefined): number[] | null {
  if (!input) return null;
  const parts = input.split(",").map((v) => v.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const nums = parts.map((v) => Number(v));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`Invalid number list: "${input}"`);
  }
  return [...new Set(nums)];
}

function attachGatewayRuntime(
  label: string,
  gateway: GatewayClient,
  client: ChordClient,
  rest: RestClient,
  ownerIds: string[]
): void {
  const preconditions = [
    guildOnly<PrefixCommandContext>(),
    cooldown({ ttlMs: 3000 })
  ];
  if (ownerIds.length > 0) {
    preconditions.unshift(ownerOnly<PrefixCommandContext>({ ownerIds }));
  }

  const prefixRouter = new PrefixCommandRouter({
    client,
    // Allow both "!ping" and plain "ping"
    prefix: (message) => (message.content.trimStart().startsWith("!") ? "!" : ""),
    reply: createPrefixReply(rest),
    preconditions
  });
  const listenerStore = client.store<Listener>("listeners");
  const binder = new GatewayListenerBinder({ gateway, listenerStore });
  const bound = binder.bindAll();

  console.log(`[${label}] listeners bound: ${bound}`);

  gateway.on("open", () => console.log(`[${label}] gateway connected`));
  gateway.on("close", (code, reason) => console.log(`[${label}] gateway closed`, { code, reason }));
  gateway.on("error", (error) => console.error(`[${label}] gateway error`, error));

  gateway.onDispatch("MESSAGE_CREATE", async (message) => {
    if (message.author?.bot) return;
    await prefixRouter.handleMessage(message);
  });
}

async function main(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("Set DISCORD_TOKEN first.");
    process.exit(1);
  }

  const mode = (process.env.MODE ?? "single") as Mode;
  const shardCount = parseShardCount(process.env.SHARD_COUNT, 2);
  const clusterCount = parsePositiveInt(process.env.CLUSTER_COUNT, 2);
  const shardIdsEnv = parseNumberList(process.env.SHARD_IDS);
  const clusterIdsEnv = parseNumberList(process.env.CLUSTER_IDS);
  const ownerIds = parseOwnerIds(process.env.OWNER_IDS);

  const here = dirname(fileURLToPath(import.meta.url));
  const commandDir = resolve(here, "commands");
  const listenerDir = resolve(here, "listeners");

  const client = new ChordClient();
  const rest = new RestClient({ token });
  const loader = new PieceLoader({ client });
  const commands = await loader.loadCommandsFrom(commandDir);
  const listeners = await loader.loadListenersFrom(listenerDir);

  console.log("folder routing loaded", {
    commands: commands.length,
    listeners: listeners.length
  });

  const gatewayBase = {
    token,
    intents: ["GuildMessages", "MessageContent"] as const
  };

  if (mode === "single") {
    const gateway = new GatewayClient(gatewayBase);
    attachGatewayRuntime("single", gateway, client, rest, ownerIds);
    gateway.connect();
    return;
  }

  if (mode === "shard") {
    const manager = await ShardManager.create({
      shardCount,
      autoShardCount: { token },
      shardIds: shardIdsEnv ?? undefined,
      gateway: gatewayBase,
      spawnDelayMs: 500
    });
    for (const shard of manager.shards.values()) {
      attachGatewayRuntime(`shard-${shard.id}`, shard.client, client, rest, ownerIds);
    }
    await manager.connectAll();
    console.log(`spawned shard manager (${manager.shardIds.length}/${manager.shardCount})`);
    return;
  }

  if (mode === "cluster") {
    const manager = await ClusterManager.create({
      shardCount,
      autoShardCount: { token },
      clusters: clusterCount,
      gateway: gatewayBase,
      spawnDelayMs: 500
    });
    for (const cluster of manager.instances.values()) {
      for (const shardId of cluster.shardIds) {
        const shard = cluster.shards.shard(shardId);
        attachGatewayRuntime(`cluster-${cluster.id}:shard-${shardId}`, shard.client, client, rest, ownerIds);
      }
    }
    await manager.connectAll();
    console.log(`spawned cluster manager (clusters=${clusterCount}, shards=${shardCount})`);
    return;
  }

  if (mode === "cluster-distributed") {
    if (!clusterIdsEnv || clusterIdsEnv.length === 0) {
      console.error('MODE="cluster-distributed" requires CLUSTER_IDS, e.g. CLUSTER_IDS="0,1"');
      process.exit(1);
    }

    const resolvedShardCount =
      shardCount === "auto" ? await resolveShardCount("auto", { token }) : shardCount;

    const infos = splitShardsIntoClusters(resolvedShardCount, clusterCount);
    const selected = infos.filter((c) => clusterIdsEnv.includes(c.id));
    if (selected.length === 0) {
      console.error("No clusters selected. Check CLUSTER_IDS and CLUSTER_COUNT.");
      process.exit(1);
    }

    for (const info of selected) {
      const shards = new ShardManager({
        shardCount: resolvedShardCount,
        shardIds: info.shardIds,
        gateway: gatewayBase,
        spawnDelayMs: 500
      });
      for (const shardId of info.shardIds) {
        const shard = shards.shard(shardId);
        attachGatewayRuntime(`cluster-${info.id}:shard-${shardId}`, shard.client, client, rest, ownerIds);
      }
      await shards.connectAll();
      console.log(`spawned distributed cluster ${info.id} (shards=${info.shardIds.join(",")})`);
    }

    console.log("distributed clusters launched", {
      clustersTotal: clusterCount,
      clustersSelected: selected.map((c) => c.id),
      shardCount: resolvedShardCount
    });
    return;
  }

  if (mode === "process") {
    const manager = await ProcessClusterManager.create({
      shardCount,
      autoShardCount: { token },
      clusters: clusterCount,
      gateway: gatewayBase,
      spawnDelayMs: 500
    });
    await manager.connectAll();
    console.log("process clusters launched", {
      clusters: clusterCount,
      shards: shardCount
    });
    console.log("note: process mode uses worker bootstrap from @chordjs/gateway.");
    return;
  }

  console.error(`Unknown MODE="${mode}"`);
  process.exit(1);
}

void main();
