/**
 * @chordjs/metrics — Bot health monitoring and metrics collection
 *
 * Features:
 * - REST request tracking (success, failure, rate limits)
 * - Gateway event counting
 * - Uptime tracking
 * - Pluggable metric exporters (Prometheus, StatsD, etc.)
 */

export interface RestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitsHit: number;
}

export interface GatewayMetrics {
  totalEvents: number;
  lastPing: number;
  uptime: number;
}

export interface MetricsSummary {
  uptime: number;
  rest: RestMetrics;
  gateway: GatewayMetrics;
}

// ─── Exporter Interface ─────────────────────────────────────────────
export interface MetricsExporter {
  export(summary: MetricsSummary): void | Promise<void>;
}

// ─── Metrics Client Interface ───────────────────────────────────────
/** Minimal interface the MetricsManager needs from a client */
export interface MetricsClient {
  readonly ping: number;
}

// ─── MetricsManager ─────────────────────────────────────────────────
export class MetricsManager {
  private readonly client: MetricsClient;
  private readonly startTime: number;
  readonly #exporters: MetricsExporter[] = [];

  public rest: RestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitsHit: 0
  };

  public gateway: GatewayMetrics = {
    totalEvents: 0,
    lastPing: -1,
    uptime: 0
  };

  constructor(client: MetricsClient) {
    this.client = client;
    this.startTime = Date.now();
  }

  /** Returns current metrics summary. */
  public getSummary(): MetricsSummary {
    return {
      uptime: Date.now() - this.startTime,
      rest: { ...this.rest },
      gateway: {
        ...this.gateway,
        lastPing: this.client.ping,
        uptime: Date.now() - this.startTime
      }
    };
  }

  /** Record a REST request outcome. */
  public _recordRest(success: boolean, rateLimit: boolean = false): void {
    this.rest.totalRequests++;
    if (success) this.rest.successfulRequests++;
    else this.rest.failedRequests++;
    if (rateLimit) this.rest.rateLimitsHit++;
  }

  /** Record a gateway event. */
  public _recordGatewayEvent(): void {
    this.gateway.totalEvents++;
  }

  /** Register a metrics exporter. */
  public addExporter(exporter: MetricsExporter): void {
    this.#exporters.push(exporter);
  }

  /** Push current metrics to all registered exporters. */
  public async flush(): Promise<void> {
    const summary = this.getSummary();
    for (const exporter of this.#exporters) {
      await exporter.export(summary);
    }
  }

  /** Reset all counters. */
  public reset(): void {
    this.rest = { totalRequests: 0, successfulRequests: 0, failedRequests: 0, rateLimitsHit: 0 };
    this.gateway = { totalEvents: 0, lastPing: -1, uptime: 0 };
  }
}
