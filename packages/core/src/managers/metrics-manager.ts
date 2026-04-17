import type { ChordClient } from "../structures/chord-client.js";

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

/**
 * Tracks performance and usage metrics for the client.
 */
export class MetricsManager {
  private readonly client: ChordClient;
  private readonly startTime: number;
  
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

  constructor(client: ChordClient) {
    this.client = client;
    this.startTime = Date.now();
  }

  /**
   * Returns current metrics summary.
   */
  public getSummary() {
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

  /**
   * Internal helper to record a REST request.
   */
  public _recordRest(success: boolean, rateLimit: boolean = false) {
    this.rest.totalRequests++;
    if (success) this.rest.successfulRequests++;
    else this.rest.failedRequests++;
    if (rateLimit) this.rest.rateLimitsHit++;
  }

  /**
   * Internal helper to record a gateway event.
   */
  public _recordGatewayEvent() {
    this.gateway.totalEvents++;
  }
}
