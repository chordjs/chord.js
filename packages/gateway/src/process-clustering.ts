import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { splitShardsIntoClusters, type ClusterInfo } from "./clustering.js";
import { resolveShardCount, type AutoShardCountOptions, type ShardCountResolvable, type ShardManagerOptions } from "./sharding.js";

export type ClusterWorkerInit = {
  shardCount: number;
  cluster: ClusterInfo;
  gateway: ShardManagerOptions["gateway"];
  identify?: ShardManagerOptions["identify"];
  spawnDelayMs?: ShardManagerOptions["spawnDelayMs"];
};

export type ClusterWorkerCommand =
  | { op: "init"; d: ClusterWorkerInit }
  | { op: "connectAll" }
  | { op: "closeAll"; d?: { code?: number; reason?: string } }
  | { op: "ping"; nonce: number };

export type ClusterWorkerEvent =
  | { op: "ready" }
  | { op: "log"; level: "debug" | "info" | "warn" | "error"; message: string }
  | { op: "pong"; nonce: number }
  | { op: "error"; message: string };

export interface ProcessClusterManagerOptions {
  shardCount: number;
  clusters: number;
  gateway: ShardManagerOptions["gateway"];
  identify?: ShardManagerOptions["identify"];
  spawnDelayMs?: ShardManagerOptions["spawnDelayMs"];

  /**
   * Override worker entry (compiled JS).
   * Default resolves to this package's built `cluster-worker.js`.
   */
  workerPath?: string;

  /**
   * Extra exec args for the runtime (bun/node).
   */
  execArgv?: string[];

  /**
   * Automatically restart worker on unexpected exit.
   */
  restartOnExit?: boolean;
  maxRestarts?: number;
  restartBaseDelayMs?: number;
  restartMaxDelayMs?: number;

  /**
   * Graceful shutdown timeout for workers. After this, workers may be terminated.
   */
  shutdownTimeoutMs?: number;

  /**
   * Override how worker processes are spawned.
   * Primarily useful for tests.
   */
  spawnChild?: () => ChildProcess;
}

export interface ProcessClusterManagerCreateOptions extends Omit<ProcessClusterManagerOptions, "shardCount"> {
  shardCount: ShardCountResolvable;
  autoShardCount?: AutoShardCountOptions;
}

export interface ProcessClusterManagerEventMap {
  ready: { clusterId: number };
  log: { clusterId: number; level: "debug" | "info" | "warn" | "error"; message: string };
  error: { clusterId: number; message: string };
  pong: { clusterId: number; nonce: number };
  exit: { clusterId: number; code: number | null; signal: NodeJS.Signals | null };
}

export interface ClusterRestartStats {
  clusterId: number;
  restartCount: number;
  lastRestartAt: number | null;
  hasPendingRestart: boolean;
}

export class ClusterProcess {
  public readonly info: ClusterInfo;
  public child: ChildProcess;

  #ready = false;
  #readyPromise: Promise<void>;
  #resolveReady!: () => void;
  #rejectReady!: (err: Error) => void;

  constructor(info: ClusterInfo, child: ChildProcess) {
    this.info = info;
    this.child = child;
    this.#readyPromise = new Promise<void>((resolve, reject) => {
      this.#resolveReady = resolve;
      this.#rejectReady = reject;
    });
  }

  get ready(): boolean {
    return this.#ready;
  }

  async waitReady(): Promise<void> {
    return this.#readyPromise;
  }

  _markReady(): void {
    if (this.#ready) return;
    this.#ready = true;
    this.#resolveReady();
  }

  _markFailed(message: string): void {
    if (this.#ready) return;
    this.#rejectReady(new Error(message));
  }

  send(msg: ClusterWorkerCommand): void {
    this.child.send?.(msg);
  }

  _replaceChild(child: ChildProcess): void {
    this.child = child;
  }
}

export class ProcessClusterManager {
  public readonly shardCount: number;
  public readonly clusters: number;
  public readonly clusterInfos: ClusterInfo[];
  public readonly processes: ReadonlyMap<number, ClusterProcess>;

  readonly #processes = new Map<number, ClusterProcess>();
  readonly #listeners = new Map<keyof ProcessClusterManagerEventMap, Set<(payload: any) => void>>();
  readonly #workerPath: string;
  readonly #opts: Omit<ProcessClusterManagerOptions, "clusters" | "shardCount" | "workerPath">;
  readonly #restartOnExit: boolean;
  readonly #maxRestarts: number;
  readonly #restartBaseDelayMs: number;
  readonly #restartMaxDelayMs: number;
  readonly #restartCounts = new Map<number, number>();
  readonly #lastRestartAt = new Map<number, number>();
  readonly #restartTimers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly #shutdownTimeoutMs: number;
  readonly #spawnChildOverride: (() => ChildProcess) | null;
  #shuttingDown = false;
  #initRequested = false;
  #connectRequested = false;

  static async create(options: ProcessClusterManagerCreateOptions): Promise<ProcessClusterManager> {
    const shardCount = await resolveShardCount(options.shardCount, options.autoShardCount);
    return new ProcessClusterManager({
      shardCount,
      clusters: options.clusters,
      gateway: options.gateway,
      identify: options.identify,
      spawnDelayMs: options.spawnDelayMs,
      workerPath: options.workerPath,
      execArgv: options.execArgv
    });
  }

  constructor(options: ProcessClusterManagerOptions) {
    this.shardCount = options.shardCount;
    this.clusters = options.clusters;
    this.clusterInfos = splitShardsIntoClusters(options.shardCount, options.clusters);
    this.#workerPath = options.workerPath ?? defaultWorkerPath();
    this.#opts = {
      gateway: options.gateway,
      identify: options.identify,
      spawnDelayMs: options.spawnDelayMs,
      execArgv: options.execArgv
    };
    this.#restartOnExit = options.restartOnExit ?? true;
    this.#maxRestarts = options.maxRestarts ?? Infinity;
    this.#restartBaseDelayMs = options.restartBaseDelayMs ?? 1000;
    this.#restartMaxDelayMs = options.restartMaxDelayMs ?? 30000;
    this.#shutdownTimeoutMs = options.shutdownTimeoutMs ?? 10_000;
    this.#spawnChildOverride = options.spawnChild ?? null;

    for (const info of this.clusterInfos) {
      const child = this.#spawnChild();
      const proc = new ClusterProcess(info, child);
      this.#wire(proc);
      this.#processes.set(info.id, proc);
    }

    this.processes = this.#processes;
  }

  cluster(id: number): ClusterProcess {
    const p = this.#processes.get(id);
    if (!p) throw new Error(`Unknown cluster: ${id}`);
    return p;
  }

  on<TEvent extends keyof ProcessClusterManagerEventMap>(
    event: TEvent,
    listener: (payload: ProcessClusterManagerEventMap[TEvent]) => void
  ): () => void {
    const set = this.#listeners.get(event) ?? new Set<(payload: ProcessClusterManagerEventMap[TEvent]) => void>();
    set.add(listener);
    this.#listeners.set(event, set as Set<(payload: any) => void>);
    return () => this.off(event, listener);
  }

  off<TEvent extends keyof ProcessClusterManagerEventMap>(
    event: TEvent,
    listener: (payload: ProcessClusterManagerEventMap[TEvent]) => void
  ): void {
    this.#listeners.get(event)?.delete(listener as (payload: any) => void);
  }

  getRestartStats(clusterId?: number): ClusterRestartStats | ClusterRestartStats[] {
    if (typeof clusterId === "number") {
      return this.#restartStatsFor(clusterId);
    }
    return this.clusterInfos.map((info) => this.#restartStatsFor(info.id));
  }

  async initAll(): Promise<void> {
    this.#initRequested = true;
    for (const proc of this.#processes.values()) {
      proc.send({
        op: "init",
        d: {
          shardCount: this.shardCount,
          cluster: proc.info,
          gateway: this.#opts.gateway,
          identify: this.#opts.identify,
          spawnDelayMs: this.#opts.spawnDelayMs
        }
      });
    }
    await Promise.all([...this.#processes.values()].map((p) => p.waitReady()));
  }

  async connectAll(): Promise<void> {
    this.#connectRequested = true;
    await this.initAll();
    for (const proc of this.#processes.values()) proc.send({ op: "connectAll" });
  }

  closeAll(code?: number, reason?: string): void {
    this.#shuttingDown = true;
    for (const timer of this.#restartTimers.values()) clearTimeout(timer);
    this.#restartTimers.clear();
    for (const proc of this.#processes.values()) {
      proc.send({ op: "closeAll", d: { code, reason } });
    }
  }

  /**
   * Gracefully shuts down all workers and enforces a timeout.
   * If workers are still running after the timeout, they will be terminated.
   */
  async shutdown(options: { code?: number; reason?: string; timeoutMs?: number } = {}): Promise<void> {
    const timeoutMs = options.timeoutMs ?? this.#shutdownTimeoutMs;
    this.closeAll(options.code, options.reason);

    const procs = [...this.#processes.values()];
    const exited = new Set<number>();

    const waitExit = (proc: ClusterProcess): Promise<void> =>
      new Promise((resolve) => {
        const id = proc.info.id;
        const child = proc.child;
        const onExit = () => {
          exited.add(id);
          resolve();
        };
        if (child.exitCode !== null || child.killed) return onExit();
        child.once("exit", onExit);
      });

    const allExitPromise = Promise.all(procs.map(waitExit)).then(() => undefined);
    const timed = new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, timeoutMs)));

    await Promise.race([allExitPromise, timed]);

    if (exited.size === procs.length) return;

    // Terminate remaining workers.
    for (const proc of procs) {
      if (exited.has(proc.info.id)) continue;
      proc.child.kill("SIGTERM");
    }

    // Give SIGTERM a short grace, then SIGKILL.
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    for (const proc of procs) {
      if (exited.has(proc.info.id)) continue;
      proc.child.kill("SIGKILL");
    }

    await Promise.race([allExitPromise, new Promise<void>((resolve) => setTimeout(resolve, 2000))]);
  }

  #wire(proc: ClusterProcess): void {
    proc.child.on("message", (msg: unknown) => {
      const ev = msg as Partial<ClusterWorkerEvent> | undefined;
      if (!ev || typeof ev.op !== "string") return;
      if (ev.op === "ready") {
        proc._markReady();
        this.#emit("ready", { clusterId: proc.info.id });
        if (this.#connectRequested) proc.send({ op: "connectAll" });
        return;
      }
      if (ev.op === "log") {
        this.#emit("log", {
          clusterId: proc.info.id,
          level: ev.level ?? "info",
          message: ev.message ?? ""
        });
        return;
      }
      if (ev.op === "pong" && typeof ev.nonce === "number") {
        this.#emit("pong", { clusterId: proc.info.id, nonce: ev.nonce });
        return;
      }
      if (ev.op === "error") {
        const message = ev.message ?? "Cluster worker error";
        proc._markFailed(message);
        this.#emit("error", { clusterId: proc.info.id, message });
      }
    });

    proc.child.on("exit", (code, signal) => {
      proc._markFailed(`Cluster worker exited code=${code} signal=${signal}`);
      this.#emit("exit", { clusterId: proc.info.id, code, signal });
      this.#scheduleRestart(proc.info.id);
    });
  }

  #emit<TEvent extends keyof ProcessClusterManagerEventMap>(
    event: TEvent,
    payload: ProcessClusterManagerEventMap[TEvent]
  ): void {
    for (const listener of this.#listeners.get(event) ?? []) {
      listener(payload);
    }
  }

  #spawnChild(): ChildProcess {
    if (this.#spawnChildOverride) return this.#spawnChildOverride();
    return fork(this.#workerPath, [], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      execArgv: this.#opts.execArgv
    });
  }

  #scheduleRestart(clusterId: number): void {
    if (this.#shuttingDown || !this.#restartOnExit) return;
    if (this.#restartTimers.has(clusterId)) return;

    const restarts = this.#restartCounts.get(clusterId) ?? 0;
    if (restarts >= this.#maxRestarts) {
      this.#emit("error", {
        clusterId,
        message: `Cluster ${clusterId} exceeded max restarts (${this.#maxRestarts})`
      });
      return;
    }

    const delay = Math.min(this.#restartBaseDelayMs * 2 ** restarts, this.#restartMaxDelayMs);
    const timer = setTimeout(() => {
      this.#restartTimers.delete(clusterId);
      this.#restartWorker(clusterId);
    }, delay);
    this.#restartTimers.set(clusterId, timer);
  }

  #restartWorker(clusterId: number): void {
    const proc = this.#processes.get(clusterId);
    if (!proc || this.#shuttingDown) return;

    this.#restartCounts.set(clusterId, (this.#restartCounts.get(clusterId) ?? 0) + 1);
    this.#lastRestartAt.set(clusterId, Date.now());
    const child = this.#spawnChild();
    proc._replaceChild(child);
    this.#wire(proc);

    if (this.#initRequested) {
      proc.send({
        op: "init",
        d: {
          shardCount: this.shardCount,
          cluster: proc.info,
          gateway: this.#opts.gateway,
          identify: this.#opts.identify,
          spawnDelayMs: this.#opts.spawnDelayMs
        }
      });
    }
  }

  #restartStatsFor(clusterId: number): ClusterRestartStats {
    return {
      clusterId,
      restartCount: this.#restartCounts.get(clusterId) ?? 0,
      lastRestartAt: this.#lastRestartAt.get(clusterId) ?? null,
      hasPendingRestart: this.#restartTimers.has(clusterId)
    };
  }
}

function defaultWorkerPath(): string {
  // Resolve to built file adjacent to this module.
  // In TS source this points at dist after compile.
  const here = new URL("./process-clustering.js", import.meta.url);
  const dir = new URL(".", here);
  return fileURLToPath(new URL("./cluster-worker.js", dir));
}

