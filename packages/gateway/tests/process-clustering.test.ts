/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { ProcessClusterManager } from "../src/process-clustering.js";

class FakeChildProcess extends EventEmitter {
  public exitCode: number | null = null;
  public killed = false;
  public sent: unknown[] = [];
  public killSignals: string[] = [];

  send(msg: unknown): void {
    this.sent.push(msg);
  }

  kill(signal?: NodeJS.Signals | number): boolean {
    this.killed = true;
    this.killSignals.push(String(signal ?? "SIGTERM"));
    return true;
  }

  emitReady(): void {
    this.emit("message", { op: "ready" });
  }

  emitExit(code: number | null = 0, signal: NodeJS.Signals | null = null): void {
    this.exitCode = code;
    this.emit("exit", code, signal);
  }
}

describe("gateway/process-clustering", () => {
  test("initAll waits for ready and emits manager ready events", async () => {
    const children: FakeChildProcess[] = [];
    const spawnChild = (): ChildProcess => {
      const child = new FakeChildProcess();
      children.push(child);
      return child as any;
    };

    const readyEvents: number[] = [];
    const manager = new ProcessClusterManager({
      shardCount: 2,
      clusters: 2,
      gateway: { token: "x", intents: ["Guilds"] },
      spawnDelayMs: 0,
      restartOnExit: false,
      spawnChild
    });
    manager.on("ready", (p) => readyEvents.push(p.clusterId));

    const init = manager.initAll();
    expect(children.length).toBe(2);

    // mark both workers ready
    children[0]!.emitReady();
    children[1]!.emitReady();

    await init;
    expect(readyEvents.sort()).toEqual([0, 1]);
  });

  test("unexpected exit schedules restart and increments restart stats", async () => {
    const children: FakeChildProcess[] = [];
    let calls = 0;
    const spawnChild = (): ChildProcess => {
      calls++;
      const child = new FakeChildProcess();
      children.push(child);
      return child as any;
    };

    const manager = new ProcessClusterManager({
      shardCount: 2,
      clusters: 2,
      gateway: { token: "x", intents: ["Guilds"] },
      spawnDelayMs: 0,
      restartOnExit: true,
      maxRestarts: 1,
      restartBaseDelayMs: 1,
      restartMaxDelayMs: 5,
      spawnChild
    });

    // Ensure init was requested so restartWorker re-sends init.
    const init = manager.initAll();
    children[0]!.emitReady();
    children[1]!.emitReady();
    await init;

    const before = manager.getRestartStats(0) as any;
    expect(before.restartCount).toBe(0);

    // Trigger exit of cluster 0 worker.
    const proc0 = manager.cluster(0);
    (proc0.child as any as FakeChildProcess).emitExit(1, "SIGTERM");

    // Allow restart timer to fire.
    await new Promise((r) => setTimeout(r, 10));

    const after = manager.getRestartStats(0) as any;
    expect(after.restartCount).toBe(1);
    expect(after.lastRestartAt).not.toBeNull();
    expect(after.hasPendingRestart).toBe(false);
    expect(calls).toBeGreaterThanOrEqual(3); // initial 2 + restart
  });

  test("shutdown resolves when workers exit (no forced kill needed)", async () => {
    const children: FakeChildProcess[] = [];
    const spawnChild = (): ChildProcess => {
      const child = new FakeChildProcess();
      children.push(child);
      return child as any;
    };

    const manager = new ProcessClusterManager({
      shardCount: 2,
      clusters: 2,
      gateway: { token: "x", intents: ["Guilds"] },
      spawnDelayMs: 0,
      restartOnExit: true,
      shutdownTimeoutMs: 50,
      spawnChild
    });

    const init = manager.initAll();
    children[0]!.emitReady();
    children[1]!.emitReady();
    await init;

    // Start shutdown; then emit exits quickly.
    const shutdown = manager.shutdown({ timeoutMs: 50 });
    children[0]!.emitExit(0, null);
    children[1]!.emitExit(0, null);

    await shutdown;
    expect(children[0]!.killSignals.length).toBe(0);
    expect(children[1]!.killSignals.length).toBe(0);
  });
});

