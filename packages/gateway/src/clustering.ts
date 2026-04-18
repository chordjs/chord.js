import {
  resolveShardCount,
  ShardManager,
  type AutoShardCountOptions,
  type ShardCountResolvable,
  type ShardMetrics,
  type ShardManagerOptions
} from "./sharding.js";
import { GatewayConnectionStatus } from "@chordjs/types";

export interface ClusterInfo {
  id: number;
  shardIds: number[];
}

export interface ClusterOptions {
  info: ClusterInfo;
  shardManager: ShardManager;
}

export class Cluster {
  public readonly id: number;
  public readonly shardIds: number[];
  public readonly shards: ShardManager;

  constructor(options: ClusterOptions) {
    this.id = options.info.id;
    this.shardIds = options.info.shardIds;
    this.shards = options.shardManager;
  }

  get status(): GatewayConnectionStatus {
    return this.shards.status;
  }

  connectAll(): Promise<void> {
    return this.shards.connectAll();
  }

  closeAll(code?: number, reason?: string): void {
    this.shards.closeAll(code, reason);
  }

  snapshotMetrics(): ShardMetrics[] {
    return this.shards.snapshotMetrics();
  }
}

export interface ClusterManagerOptions {
  shardCount: number;
  clusters: number;
  gateway: ShardManagerOptions["gateway"];
  identify?: ShardManagerOptions["identify"];
  spawnDelayMs?: ShardManagerOptions["spawnDelayMs"];
}

export interface ClusterManagerCreateOptions extends Omit<ClusterManagerOptions, "shardCount"> {
  shardCount: ShardCountResolvable;
  autoShardCount?: AutoShardCountOptions;
}

export class ClusterManager {
  public readonly shardCount: number;
  public readonly clusters: number;
  public readonly clusterInfos: ClusterInfo[];
  public readonly instances: ReadonlyMap<number, Cluster>;

  readonly #instances = new Map<number, Cluster>();

  static async create(options: ClusterManagerCreateOptions): Promise<ClusterManager> {
    const shardCount = await resolveShardCount(options.shardCount, options.autoShardCount);
    return new ClusterManager({
      shardCount,
      clusters: options.clusters,
      gateway: options.gateway,
      identify: options.identify,
      spawnDelayMs: options.spawnDelayMs
    });
  }

  constructor(options: ClusterManagerOptions) {
    this.shardCount = options.shardCount;
    this.clusters = options.clusters;
    if (options.clusters <= 0) throw new Error("ClusterManager: clusters must be > 0");

    this.clusterInfos = splitShardsIntoClusters(options.shardCount, options.clusters);

    for (const info of this.clusterInfos) {
      const shardManager = new ShardManager({
        shardCount: options.shardCount,
        shardIds: info.shardIds,
        gateway: options.gateway,
        identify: options.identify,
        spawnDelayMs: options.spawnDelayMs
      });
      this.#instances.set(info.id, new Cluster({ info, shardManager }));
    }

    this.instances = this.#instances;
  }

  get status(): GatewayConnectionStatus {
    const statuses = Array.from(this.#instances.values()).map((c) => c.status);
    if (statuses.every((s) => s === GatewayConnectionStatus.Connected)) return GatewayConnectionStatus.Connected;
    if (statuses.every((s) => s === GatewayConnectionStatus.Disconnected)) return GatewayConnectionStatus.Disconnected;
    if (statuses.some((s) => s === GatewayConnectionStatus.Connecting || s === GatewayConnectionStatus.Reconnecting || s === GatewayConnectionStatus.Resuming)) {
      return GatewayConnectionStatus.Connecting;
    }
    return GatewayConnectionStatus.Disconnected;
  }

  cluster(id: number): Cluster {
    const c = this.#instances.get(id);
    if (!c) throw new Error(`Unknown cluster: ${id}`);
    return c;
  }

  async connectAll(): Promise<void> {
    for (const cluster of this.#instances.values()) {
      await cluster.connectAll();
    }
  }

  closeAll(code?: number, reason?: string): void {
    for (const cluster of this.#instances.values()) cluster.closeAll(code, reason);
  }

  snapshotMetrics(): Array<{ clusterId: number; shards: ShardMetrics[] }> {
    return [...this.#instances.values()].map((cluster) => ({
      clusterId: cluster.id,
      shards: cluster.snapshotMetrics()
    }));
  }

  aggregateMetrics(): {
    clusters: Array<{
      clusterId: number;
      shardCount: number;
      avgLatencyMs: number | null;
      totalResumeCount: number;
    }>;
    overall: {
      shardCount: number;
      avgLatencyMs: number | null;
      totalResumeCount: number;
    };
  } {
    const clusters = this.snapshotMetrics().map(({ clusterId, shards }) => {
      const latencies = shards.map((s) => s.latencyMs).filter((n): n is number => typeof n === "number");
      const avgLatencyMs = latencies.length === 0 ? null : latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const totalResumeCount = shards.reduce((acc, s) => acc + (s.resumeCount ?? 0), 0);
      return {
        clusterId,
        shardCount: shards.length,
        avgLatencyMs,
        totalResumeCount
      };
    });

    const allShards = clusters.reduce((acc, c) => acc + c.shardCount, 0);
    const allLatencies = clusters
      .flatMap((c) => (typeof c.avgLatencyMs === "number" ? [c.avgLatencyMs] : []));
    const overallAvgLatencyMs =
      allLatencies.length === 0 ? null : allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    const overallResumeCount = clusters.reduce((acc, c) => acc + c.totalResumeCount, 0);

    return {
      clusters,
      overall: {
        shardCount: allShards,
        avgLatencyMs: overallAvgLatencyMs,
        totalResumeCount: overallResumeCount
      }
    };
  }
}

export function splitShardsIntoClusters(shardCount: number, clusterCount: number): ClusterInfo[] {
  const out: ClusterInfo[] = [];
  for (let i = 0; i < clusterCount; i++) out.push({ id: i, shardIds: [] });

  for (let shardId = 0; shardId < shardCount; shardId++) {
    const clusterId = shardId % clusterCount;
    out[clusterId]!.shardIds.push(shardId);
  }

  return out;
}
