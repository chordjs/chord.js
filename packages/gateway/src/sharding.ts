import { sleep } from "@chordjs/utils";
import { GatewayClient, type GatewayClientOptions, type GatewayMetrics } from "./gateway-client.js";

export interface IdentifySchedulerOptions {
  /**
   * Discord recommends identifying no more than 1 shard per 5s per "cluster".
   * Keep this configurable for future tuning.
   */
  minIdentifyIntervalMs?: number;
}

export class IdentifyScheduler {
  readonly #minIdentifyIntervalMs: number;
  #lastIdentifyAt = 0;
  #queue: Promise<void> = Promise.resolve();

  constructor(options: IdentifySchedulerOptions = {}) {
    this.#minIdentifyIntervalMs = options.minIdentifyIntervalMs ?? 5000;
  }

  async waitTurn(): Promise<void> {
    const task = async () => {
      const now = Date.now();
      const nextAt = this.#lastIdentifyAt + this.#minIdentifyIntervalMs;
      const delay = nextAt - now;
      if (delay > 0) await sleep(delay);
      this.#lastIdentifyAt = Date.now();
    };

    const chained = this.#queue.then(task, task);
    this.#queue = chained.then(
      () => undefined,
      () => undefined
    );
    return chained;
  }
}

export interface ShardOptions {
  id: number;
  total: number;
  gateway: Omit<GatewayClientOptions, "shard">;
  identify?: IdentifyScheduler;
}

export interface ShardMetrics extends GatewayMetrics {
  shardId: number;
}

export class Shard {
  public readonly id: number;
  public readonly total: number;
  public readonly client: GatewayClient;
  readonly #identify: IdentifyScheduler | null;

  constructor(options: ShardOptions) {
    this.id = options.id;
    this.total = options.total;
    this.#identify = options.identify ?? null;

    this.client = new GatewayClient({
      ...options.gateway,
      shard: [options.id, options.total]
    });
  }

  async connect(): Promise<void> {
    // Best-effort: spread identify storms across shards.
    // This does not guarantee perfect behavior, but gives a safe baseline.
    if (this.#identify) await this.#identify.waitTurn();
    this.client.connect();
  }

  close(code?: number, reason?: string): void {
    this.client.close(code, reason);
  }

  get metrics(): ShardMetrics {
    return {
      shardId: this.id,
      ...this.client.metrics
    };
  }
}

export interface ShardManagerOptions {
  shardCount: number;
  shardIds?: number[];
  gateway: Omit<GatewayClientOptions, "shard">;
  identify?: IdentifySchedulerOptions;
  spawnDelayMs?: number;
}

export type ShardCountResolvable = number | "auto";

export interface AutoShardCountOptions {
  token: string;
  baseUrl?: string;
  minimum?: number;
}

export interface DiscordGatewayBotResponse {
  shards: number;
}

export async function fetchRecommendedShardCount(options: AutoShardCountOptions): Promise<number> {
  const baseUrl = options.baseUrl ?? "https://discord.com/api/v10";
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/gateway/bot`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${options.token}`
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fetchRecommendedShardCount failed: ${res.status} ${text}`);
  }
  const body = (await res.json()) as DiscordGatewayBotResponse;
  const shards = Number(body.shards);
  if (!Number.isInteger(shards) || shards <= 0) {
    throw new Error("fetchRecommendedShardCount failed: invalid shard count in response");
  }
  return Math.max(options.minimum ?? 1, shards);
}

export async function resolveShardCount(
  shardCount: ShardCountResolvable,
  options?: AutoShardCountOptions
): Promise<number> {
  if (shardCount !== "auto") return shardCount;
  if (!options) throw new Error("resolveShardCount: auto shard count requires options");
  return fetchRecommendedShardCount(options);
}

export interface ShardManagerCreateOptions extends Omit<ShardManagerOptions, "shardCount"> {
  shardCount: ShardCountResolvable;
  autoShardCount?: AutoShardCountOptions;
}

export class ShardManager {
  public readonly shardCount: number;
  public readonly shardIds: number[];
  public readonly shards: ReadonlyMap<number, Shard>;

  readonly #identify: IdentifyScheduler;
  readonly #spawnDelayMs: number;
  readonly #shards = new Map<number, Shard>();
  readonly #metricListeners = new Set<(metrics: ShardMetrics) => void>();

  static async create(options: ShardManagerCreateOptions): Promise<ShardManager> {
    const shardCount = await resolveShardCount(options.shardCount, options.autoShardCount);
    return new ShardManager({
      shardCount,
      shardIds: options.shardIds,
      gateway: options.gateway,
      identify: options.identify,
      spawnDelayMs: options.spawnDelayMs
    });
  }

  constructor(options: ShardManagerOptions) {
    this.shardCount = options.shardCount;
    this.shardIds = options.shardIds ?? Array.from({ length: options.shardCount }, (_, i) => i);
    this.#identify = new IdentifyScheduler(options.identify);
    this.#spawnDelayMs = options.spawnDelayMs ?? 0;

    for (const id of this.shardIds) {
      if (id < 0 || id >= this.shardCount) throw new Error(`ShardManager: invalid shard id ${id}`);
      const shard = new Shard({
        id,
        total: this.shardCount,
        gateway: options.gateway,
        identify: this.#identify
      });
      this.#wireMetrics(shard);
      this.#shards.set(id, shard);
    }

    this.shards = this.#shards;
  }

  shard(id: number): Shard {
    const s = this.#shards.get(id);
    if (!s) throw new Error(`Unknown shard: ${id}`);
    return s;
  }

  async connectAll(): Promise<void> {
    for (const id of this.shardIds) {
      await this.shard(id).connect();
      if (this.#spawnDelayMs > 0) await sleep(this.#spawnDelayMs);
    }
  }

  closeAll(code?: number, reason?: string): void {
    for (const shard of this.#shards.values()) shard.close(code, reason);
  }

  snapshotMetrics(): ShardMetrics[] {
    return this.shardIds.map((id) => this.shard(id).metrics);
  }

  onMetrics(
    listener: (metrics: ShardMetrics) => void,
    options: { intervalMs?: number; immediate?: boolean } = {}
  ): () => void {
    const intervalMs = options.intervalMs ?? 0;
    const immediate = options.immediate ?? true;

    this.#metricListeners.add(listener);

    let timer: ReturnType<typeof setInterval> | null = null;
    if (intervalMs > 0) {
      timer = setInterval(() => {
        for (const metrics of this.snapshotMetrics()) listener(metrics);
      }, intervalMs);
      if (immediate) {
        for (const metrics of this.snapshotMetrics()) listener(metrics);
      }
    }

    return () => {
      this.#metricListeners.delete(listener);
      if (timer) clearInterval(timer);
    };
  }

  #wireMetrics(shard: Shard): void {
    const emit = () => {
      const metrics = shard.metrics;
      for (const listener of this.#metricListeners) listener(metrics);
    };
    shard.client.on("open", emit);
    shard.client.on("close", emit);
    shard.client.on("raw", emit);
  }
}

