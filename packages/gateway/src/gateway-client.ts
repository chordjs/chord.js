import { sleep } from "@chordjs/utils";
import {
  resolveGatewayIntents,
  GatewayOpcode,
  type GatewayDispatchDataMap,
  type GatewayDispatchEvent,
  type GatewayDispatch,
  type GatewayHello,
  type GatewayIdentifyData,
  type GatewayIntentResolvable,
  type GatewayInvalidSession,
  type GatewayPayload,
  type GatewayPresence
} from "@chordjs/types";
import { inflateSync } from "node:zlib";

export interface GatewayClientOptions {
  url?: string;
  token: string;
  intents: GatewayIntentResolvable;
  properties?: Record<string, string>;
  presence?: GatewayPresence;
  compress?: boolean;
  shard?: [number, number];
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  /**
   * If a RESUME doesn't get a RESUMED/READY dispatch within this time,
   * fall back to IDENTIFY.
   */
  resumeTimeoutMs?: number;
}

export type GatewayEventMap = {
  open: () => void;
  close: (code: number, reason: string) => void;
  raw: (payload: GatewayPayload) => void;
  dispatch: {
    <TEvent extends GatewayDispatchEvent>(event: TEvent, data: GatewayDispatchDataMap[TEvent]): void;
    (event: string, data: unknown): void;
  };
  debug: (message: string) => void;
  error: (error: unknown) => void;
};

export interface GatewayMetrics {
  latencyMs: number | null;
  lastHeartbeatSentAt: number | null;
  lastHeartbeatAckAt: number | null;
  resumeCount: number;
}

class Emitter<TEvents extends Record<string, (...args: any[]) => any>> {
  readonly #listeners = new Map<keyof TEvents, Set<Function>>();

  on<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    const set = this.#listeners.get(event) ?? new Set();
    set.add(listener as unknown as Function);
    this.#listeners.set(event, set);
  }

  off<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    set.delete(listener as unknown as Function);
    if (set.size === 0) this.#listeners.delete(event);
  }

  once<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    const wrapped = ((...args: any[]) => {
      this.off(event, wrapped as unknown as TEvents[K]);
      (listener as any)(...args);
    }) as unknown as TEvents[K];
    this.on(event, wrapped);
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.#listeners.delete(event);
    } else {
      this.#listeners.clear();
    }
  }

  emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const fn of set) (fn as any)(...args);
  }
}

export class GatewayClient {
  public readonly url: string;
  public readonly token: string;
  public readonly intents: number;
  public readonly properties: Record<string, string>;
  public readonly presence?: GatewayPresence;
  public readonly compress: boolean;
  public readonly shard?: [number, number];
  public readonly autoReconnect: boolean;
  public readonly reconnectDelayMs: number;
  public readonly resumeTimeoutMs: number;

  get latency(): number | null {
    return this.#latencyMs;
  }

  readonly #emitter = new Emitter<GatewayEventMap>();
  readonly #dispatchHandlers = new Map<string, Set<(data: unknown) => void>>();
  #ws: WebSocket | null = null;
  #heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  #heartbeatIntervalMs: number | null = null;
  #heartbeatAcked = true;
  #seq: number | null = null;
  #sessionId: string | null = null;
  #closing = false;
  #zlibBuffer: Uint8Array | null = null;
  #resuming = false;
  #resumeTimer: ReturnType<typeof setTimeout> | null = null;
  #lastHeartbeatSentAt: number | null = null;
  #lastHeartbeatAckAt: number | null = null;
  #latencyMs: number | null = null;
  #resumeCount = 0;

  constructor(options: GatewayClientOptions) {
    this.url = options.url ?? "wss://gateway.discord.gg/?v=10&encoding=json";
    this.token = options.token;
    this.intents = resolveGatewayIntents(options.intents);
    this.properties = options.properties ?? {
      os: "darwin",
      browser: "chord.js",
      device: "chord.js"
    };
    this.presence = options.presence;
    this.compress = options.compress ?? false;
    this.shard = options.shard;
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1000;
    this.resumeTimeoutMs = options.resumeTimeoutMs ?? 10_000;
  }

  on<K extends keyof GatewayEventMap>(event: K, listener: GatewayEventMap[K]): this {
    this.#emitter.on(event, listener);
    return this;
  }

  off<K extends keyof GatewayEventMap>(event: K, listener: GatewayEventMap[K]): this {
    this.#emitter.off(event, listener);
    return this;
  }

  once<K extends keyof GatewayEventMap>(event: K, listener: GatewayEventMap[K]): this {
    this.#emitter.once(event, listener);
    return this;
  }

  removeAllListeners<K extends keyof GatewayEventMap>(event?: K): this {
    this.#emitter.removeAllListeners(event);
    return this;
  }

  onDispatch<TEvent extends GatewayDispatchEvent>(
    event: TEvent,
    handler: (data: GatewayDispatchDataMap[TEvent]) => void | Promise<void>
  ): this;
  onDispatch(event: string, handler: (data: unknown) => void | Promise<void>): this;
  onDispatch(event: string, handler: (data: unknown) => void | Promise<void>): this {
    const set = this.#dispatchHandlers.get(event) ?? new Set();
    set.add(handler as (data: unknown) => void);
    this.#dispatchHandlers.set(event, set);
    return this;
  }

  onceDispatch<TEvent extends GatewayDispatchEvent>(
    event: TEvent,
    handler: (data: GatewayDispatchDataMap[TEvent]) => void | Promise<void>
  ): this;
  onceDispatch(event: string, handler: (data: unknown) => void | Promise<void>): this;
  onceDispatch(event: string, handler: (data: unknown) => void | Promise<void>): this {
    const wrapped = async (data: unknown) => {
      this.offDispatch(event, wrapped);
      await handler(data);
    };
    return this.onDispatch(event, wrapped);
  }

  offDispatch<TEvent extends GatewayDispatchEvent>(
    event: TEvent,
    handler: (data: GatewayDispatchDataMap[TEvent]) => void | Promise<void>
  ): this;
  offDispatch(event: string, handler: (data: unknown) => void | Promise<void>): this;
  offDispatch(event: string, handler: (data: unknown) => void | Promise<void>): this {
    const set = this.#dispatchHandlers.get(event);
    if (!set) return this;
    set.delete(handler as (data: unknown) => void);
    if (set.size === 0) this.#dispatchHandlers.delete(event);
    return this;
  }

  removeAllDispatch(event?: string): this {
    if (typeof event === "string") this.#dispatchHandlers.delete(event);
    else this.#dispatchHandlers.clear();
    return this;
  }

  get sessionId(): string | null {
    return this.#sessionId;
  }

  get seq(): number | null {
    return this.#seq;
  }

  get metrics(): GatewayMetrics {
    return {
      latencyMs: this.#latencyMs,
      lastHeartbeatSentAt: this.#lastHeartbeatSentAt,
      lastHeartbeatAckAt: this.#lastHeartbeatAckAt,
      resumeCount: this.#resumeCount
    };
  }

  connect(): void {
    if (this.#ws) throw new Error("GatewayClient: already connected");
    this.#closing = false;
    const ws = new WebSocket(this.#gatewayUrl());
    this.#ws = ws;

    ws.addEventListener("open", () => {
      this.#emitter.emit("debug", "gateway open");
      this.#emitter.emit("open");
    });
    ws.addEventListener("close", (ev: CloseEvent) => {
      this.#emitter.emit("debug", `gateway close code=${ev.code} reason=${ev.reason}`);
      this.#stopHeartbeat();
      this.#clearResumeTimer();
      this.#ws = null;
      this.#zlibBuffer = null;
      this.#emitter.emit("close", ev.code, ev.reason);
      void this.#maybeReconnect(ev.code);
    });
    ws.addEventListener("error", (ev: Event) => this.#emitter.emit("error", ev));
    ws.addEventListener("message", (ev: MessageEvent) => {
      void this.#onMessage(ev.data);
    });
  }

  send(payload: GatewayPayload): void {
    if (!this.#ws) throw new Error("GatewayClient: not connected");
    this.#ws.send(JSON.stringify(payload));
  }

  close(code = 1000, reason = "Normal Closure"): void {
    this.#closing = true;
    this.#stopHeartbeat();
    this.#clearResumeTimer();
    this.#ws?.close(code, reason);
    this.#ws = null;
  }

  async #maybeReconnect(code: number): Promise<void> {
    if (this.#closing) return;
    if (!this.autoReconnect) return;

    const policy = this.#reconnectPolicy(code);
    if (policy.action === "stop") {
      this.#emitter.emit("debug", `reconnect stopped for close code=${code}`);
      return;
    }

    if (policy.action === "clear-session") {
      this.#emitter.emit("debug", `clearing session for close code=${code}`);
      this.#sessionId = null;
      this.#seq = null;
      this.#resuming = false;
      this.#clearResumeTimer();
    }

    const delayMs = policy.delayMs ?? this.reconnectDelayMs;
    this.#emitter.emit("debug", `reconnect scheduled in ${delayMs}ms (code=${code})`);
    await sleep(delayMs);
    if (this.#ws || this.#closing) return;
    this.connect();
  }

  #reconnectPolicy(code: number): { action: "reconnect" | "clear-session" | "stop"; delayMs?: number } {
    // 1000: normal closure. If user didn't request close explicitly, we still shouldn't thrash.
    if (code === 1000) return { action: "stop" };

    // Common non-recoverable codes (token/config problems)
    // 4004 Authentication failed
    // 4010 Invalid shard, 4011 Sharding required
    // 4012 Invalid API version
    // 4013 Invalid intent(s), 4014 Disallowed intent(s)
    if (code === 4004 || code === 4010 || code === 4011 || code === 4012 || code === 4013 || code === 4014) {
      return { action: "stop" };
    }

    // 4008 Rate limited: back off hard.
    if (code === 4008) return { action: "reconnect", delayMs: Math.max(this.reconnectDelayMs, 60_000) };

    // 4007 Invalid seq: must drop session and IDENTIFY next time.
    if (code === 4007) return { action: "clear-session" };

    // 4009 Session timed out: cannot resume.
    if (code === 4009) return { action: "clear-session" };

    // 4003 Not authenticated: identify again (drop session).
    if (code === 4003) return { action: "clear-session" };

    // 4000 Unknown error, 4001 Unknown opcode, 4002 Decode error, 4005 Already authenticated
    // For these, reconnect and let the next HELLO drive IDENTIFY/RESUME.
    return { action: "reconnect" };
  }

  async #onMessage(data: unknown): Promise<void> {
    try {
      if (typeof data === "string") {
        const payload = JSON.parse(data) as GatewayPayload;
        await this.#onPayload(payload);
        return;
      }

      // Bun typically delivers Uint8Array for binary frames; handle common shapes.
      let bytes: Uint8Array | null = null;
      if (data instanceof Uint8Array) bytes = data;
      else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
      else if (data && typeof (data as any).arrayBuffer === "function") {
        const ab = await (data as any).arrayBuffer();
        bytes = new Uint8Array(ab);
      }

      if (!bytes) {
        this.#emitter.emit("error", new Error("GatewayClient: unsupported message data type"));
        return;
      }

      if (!this.compress) {
        const payload = JSON.parse(new TextDecoder().decode(bytes)) as GatewayPayload;
        await this.#onPayload(payload);
        return;
      }

      const maybeJson = this.#pushZlibChunk(bytes);
      if (!maybeJson) return;
      const payload = JSON.parse(maybeJson) as GatewayPayload;
      await this.#onPayload(payload);
    } catch (error) {
      this.#emitter.emit("error", error);
    }
  }

  #pushZlibChunk(chunk: Uint8Array): string | null {
    const suffix = new Uint8Array([0x00, 0x00, 0xff, 0xff]);
    const buffer = this.#zlibBuffer ? this.#concat(this.#zlibBuffer, chunk) : chunk;
    this.#zlibBuffer = buffer;

    if (buffer.length < 4) return null;
    const end = buffer.subarray(buffer.length - 4);
    if (!(end[0] === suffix[0] && end[1] === suffix[1] && end[2] === suffix[2] && end[3] === suffix[3])) {
      return null;
    }

    const inflated = inflateSync(buffer);
    this.#zlibBuffer = null;
    return inflated.toString("utf8");
  }

  #concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  #gatewayUrl(): string {
    if (!this.compress) return this.url;
    const u = new URL(this.url);
    if (!u.searchParams.has("compress")) u.searchParams.set("compress", "zlib-stream");
    return u.toString();
  }

  async #onPayload(payload: GatewayPayload): Promise<void> {
    this.#emitter.emit("raw", payload);
    if (typeof payload.s === "number") this.#seq = payload.s;

    switch (payload.op) {
      case GatewayOpcode.Hello: {
        const hello = payload as GatewayHello;
        this.#heartbeatIntervalMs = hello.d.heartbeat_interval;
        this.#startHeartbeat(hello.d.heartbeat_interval);
        await this.#identifyOrResume();
        return;
      }
      case GatewayOpcode.HeartbeatAck: {
        this.#heartbeatAcked = true;
        this.#lastHeartbeatAckAt = Date.now();
        this.#latencyMs =
          this.#lastHeartbeatSentAt === null ? null : Math.max(0, this.#lastHeartbeatAckAt - this.#lastHeartbeatSentAt);
        return;
      }
      case GatewayOpcode.Reconnect: {
        this.#emitter.emit("debug", "gateway requested reconnect");
        this.#ws?.close(4000, "Reconnect requested");
        return;
      }
      case GatewayOpcode.InvalidSession: {
        const invalid = payload as GatewayInvalidSession;
        this.#emitter.emit("debug", `invalid session resumable=${invalid.d}`);
        this.#clearResumeTimer();
        this.#resuming = false;
        if (!invalid.d) {
          this.#sessionId = null;
          this.#seq = null;
        }
        await sleep(1000 + Math.floor(Math.random() * 4000));
        await this.#identifyOrResume();
        return;
      }
      case GatewayOpcode.Dispatch: {
        const dispatch = payload as GatewayDispatch;
        if (dispatch.t === "READY" && typeof dispatch.d === "object" && dispatch.d) {
          const maybe = dispatch.d as { session_id?: unknown };
          if (typeof maybe.session_id === "string") {
            this.#sessionId = maybe.session_id;
            this.#emitter.emit("debug", `session_id set ${this.#sessionId}`);
          }
          // READY means we're fully connected even if we tried resuming
          this.#clearResumeTimer();
          this.#resuming = false;
        }
        if (dispatch.t === "RESUMED") {
          this.#emitter.emit("debug", "session resumed");
          this.#resumeCount++;
          this.#clearResumeTimer();
          this.#resuming = false;
        }
        this.#emitter.emit("dispatch", dispatch.t, dispatch.d);
        await this.#emitDispatchHandlers(dispatch.t, dispatch.d);
        return;
      }
      default:
        return;
    }
  }

  #startHeartbeat(intervalMs: number): void {
    this.#stopHeartbeat();
    this.#heartbeatAcked = true;

    this.#heartbeatTimer = setInterval(() => {
      if (!this.#heartbeatAcked) {
        this.#emitter.emit("debug", "missed heartbeat ack; closing socket");
        this.#ws?.close(4001, "Heartbeat ACK missing");
        return;
      }
      this.#heartbeatAcked = false;
      this.#lastHeartbeatSentAt = Date.now();
      this.send({ op: GatewayOpcode.Heartbeat, d: this.#seq });
    }, intervalMs);

    // Discord recommends sending a heartbeat immediately after HELLO (randomized jitter)
    const jitterMs = Math.floor(Math.random() * intervalMs);
    setTimeout(() => {
      if (!this.#ws) return;
      this.#heartbeatAcked = false;
      this.#lastHeartbeatSentAt = Date.now();
      this.send({ op: GatewayOpcode.Heartbeat, d: this.#seq });
    }, jitterMs);
  }

  #stopHeartbeat(): void {
    if (this.#heartbeatTimer) clearInterval(this.#heartbeatTimer);
    this.#heartbeatTimer = null;
    this.#heartbeatIntervalMs = null;
    this.#heartbeatAcked = true;
  }

  #startResumeTimer(): void {
    this.#clearResumeTimer();
    if (this.resumeTimeoutMs <= 0) return;
    this.#resumeTimer = setTimeout(() => {
      if (!this.#ws) return;
      if (!this.#resuming) return;
      this.#emitter.emit("debug", "resume timed out; falling back to IDENTIFY");
      this.#sessionId = null;
      this.#seq = null;
      this.#resuming = false;
      void this.#identifyOrResume();
    }, this.resumeTimeoutMs);
  }

  #clearResumeTimer(): void {
    if (this.#resumeTimer) clearTimeout(this.#resumeTimer);
    this.#resumeTimer = null;
  }

  async #identifyOrResume(): Promise<void> {
    // Resume if we have enough info
    if (this.#sessionId && typeof this.#seq === "number") {
      this.#emitter.emit("debug", "sending RESUME");
      this.#resuming = true;
      this.#startResumeTimer();
      this.send({
        op: GatewayOpcode.Resume,
        d: { token: this.token, session_id: this.#sessionId, seq: this.#seq }
      });
      return;
    }

    this.#emitter.emit("debug", "sending IDENTIFY");
    const identifyData: GatewayIdentifyData = {
      token: this.token,
      intents: this.intents,
      properties: this.properties,
      compress: this.compress,
      large_threshold: 250,
      ...(this.presence ? { presence: this.presence } : null),
      ...(this.shard ? { shard: this.shard } : null)
    };

    this.send({
      op: GatewayOpcode.Identify,
      d: identifyData
    });
  }

  async #emitDispatchHandlers(event: string, data: unknown): Promise<void> {
    const set = this.#dispatchHandlers.get(event);
    if (!set || set.size === 0) return;

    for (const handler of [...set]) {
      try {
        await handler(data);
      } catch (error) {
        this.#emitter.emit("error", error);
      }
    }
  }
}

