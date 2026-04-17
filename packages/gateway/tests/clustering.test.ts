/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { ClusterManager } from "../src/clustering.js";

describe("gateway/clustering", () => {
  test("aggregateMetrics computes avg latency and resume totals", () => {
    const manager = new ClusterManager({
      shardCount: 4,
      clusters: 2,
      gateway: {
        token: "x",
        intents: ["Guilds"]
      },
      spawnDelayMs: 0
    });

    // Inject deterministic metrics by overriding the instance getter.
    const desiredByShardId = new Map<number, { latencyMs: number; resumeCount: number }>([
      [0, { latencyMs: 10, resumeCount: 1 }],
      [1, { latencyMs: 30, resumeCount: 2 }],
      [2, { latencyMs: 20, resumeCount: 3 }],
      [3, { latencyMs: 40, resumeCount: 4 }]
    ]);

    for (const cluster of manager.instances.values()) {
      for (const shardId of cluster.shardIds) {
        const shard = cluster.shards.shard(shardId);
        const desired = desiredByShardId.get(shardId)!;
        Object.defineProperty(shard.client, "metrics", {
          value: {
            latencyMs: desired.latencyMs,
            lastHeartbeatAckAt: null,
            lastHeartbeatSentAt: null,
            resumeCount: desired.resumeCount
          },
          configurable: true
        });
      }
    }

    const aggregated = manager.aggregateMetrics();
    expect(aggregated.overall.shardCount).toBe(4);
    expect(aggregated.overall.totalResumeCount).toBe(1 + 2 + 3 + 4);
    expect(aggregated.overall.avgLatencyMs).toBe(25);

    // cluster 0 gets shards 0,2 (split is shardId % clusterCount)
    const c0 = aggregated.clusters.find((c) => c.clusterId === 0)!;
    expect(c0.shardCount).toBe(2);
    expect(c0.totalResumeCount).toBe(1 + 3);
    expect(c0.avgLatencyMs).toBe(15);

    // cluster 1 gets shards 1,3
    const c1 = aggregated.clusters.find((c) => c.clusterId === 1)!;
    expect(c1.shardCount).toBe(2);
    expect(c1.totalResumeCount).toBe(2 + 4);
    expect(c1.avgLatencyMs).toBe(35);
  });
});

