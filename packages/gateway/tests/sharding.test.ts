/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { resolveShardCount, ShardManager } from "../src/sharding.js";

describe("gateway/sharding", () => {
  test("resolveShardCount(auto) uses /gateway/bot shards", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ shards: 7 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })) as unknown as typeof fetch;

    try {
      const resolved = await resolveShardCount("auto", { token: "x", baseUrl: "https://discord.com/api/v10" });
      expect(resolved).toBe(7);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("ShardManager.onMetrics supports interval sampling", async () => {
    const manager = new ShardManager({
      shardCount: 2,
      gateway: {
        token: "x",
        intents: ["Guilds"]
      },
      spawnDelayMs: 0
    });

    const calls: number[] = [];
    const off = manager.onMetrics(
      (m) => {
        calls.push(m.shardId);
      },
      { intervalMs: 10, immediate: true }
    );

    // immediate should emit both shards once
    await new Promise((r) => setTimeout(r, 1));
    expect(calls.filter((x) => x === 0).length).toBeGreaterThan(0);
    expect(calls.filter((x) => x === 1).length).toBeGreaterThan(0);

    const before = calls.length;
    await new Promise((r) => setTimeout(r, 25));
    expect(calls.length).toBeGreaterThan(before);

    off();
    const afterOff = calls.length;
    await new Promise((r) => setTimeout(r, 25));
    expect(calls.length).toBe(afterOff);
  });
});

