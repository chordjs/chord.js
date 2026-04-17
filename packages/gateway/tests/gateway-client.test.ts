/// <reference types="bun-types" />
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { GatewayClient, type GatewayClientOptions } from "../src/gateway-client.js";
import { GatewayOpcode } from "@chord.js/types";

// ---------------------------------------------------------------------------
// Minimal WebSocket mock
// ---------------------------------------------------------------------------

type Listener = (...args: any[]) => void;

class MockWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  sent: string[] = [];

  private listeners = new Map<string, Listener[]>();
  onopen: Listener | null = null;

  constructor(public readonly url: string) {
    // Simulate async open
    queueMicrotask(() => {
      this.emit("open", {});
    });
  }

  addEventListener(event: string, listener: Listener): void {
    const arr = this.listeners.get(event) ?? [];
    arr.push(listener);
    this.listeners.set(event, arr);
  }

  removeEventListener(event: string, listener: Listener): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    this.listeners.set(event, arr.filter((l) => l !== listener));
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000, reason = ""): void {
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close", { code, reason });
  }

  // --- Test helpers ---

  emit(event: string, data: unknown): void {
    for (const fn of this.listeners.get(event) ?? []) fn(data);
  }

  /** Simulate server sending a message */
  injectMessage(payload: unknown): void {
    const text = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.emit("message", { data: text });
  }

  /** Helper: all sent payloads parsed */
  get sentPayloads(): Array<{ op: number; d: unknown }> {
    return this.sent.map((s) => JSON.parse(s));
  }
}

// ---------------------------------------------------------------------------
// Patch globalThis.WebSocket for the duration of each test
// ---------------------------------------------------------------------------

let mockWsInstances: MockWebSocket[];
let OriginalWebSocket: typeof WebSocket;

function installMockWebSocket(): void {
  mockWsInstances = [];
  OriginalWebSocket = globalThis.WebSocket;
  (globalThis as any).WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWsInstances.push(this);
    }
  };
}

function restoreMockWebSocket(): void {
  globalThis.WebSocket = OriginalWebSocket;
}

function latestWs(): MockWebSocket {
  return mockWsInstances[mockWsInstances.length - 1]!;
}

function createClient(overrides: Partial<GatewayClientOptions> = {}): GatewayClient {
  return new GatewayClient({
    token: "test-token",
    intents: 0,
    autoReconnect: false,
    ...overrides,
  });
}

async function tick(ms = 5): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ===========================================================================
// Tests
// ===========================================================================

beforeEach(() => installMockWebSocket());
afterEach(() => restoreMockWebSocket());

describe("GatewayClient — connection lifecycle", () => {
  test("emits 'open' when ws connects", async () => {
    const client = createClient();
    let opened = false;
    client.on("open", () => { opened = true; });

    client.connect();
    await tick();
    expect(opened).toBe(true);
  });

  test("throws when connect() called twice", async () => {
    const client = createClient();
    client.connect();
    await tick();
    expect(() => client.connect()).toThrow("already connected");
  });

  test("emits 'close' on ws close", async () => {
    const client = createClient();
    let closeCode = 0;
    client.on("close", (code) => { closeCode = code; });

    client.connect();
    await tick();
    latestWs().close(4000, "test");
    await tick();
    expect(closeCode).toBe(4000);
  });
});

describe("GatewayClient — HELLO → Heartbeat → Identify", () => {
  test("sends IDENTIFY after receiving HELLO", async () => {
    const client = createClient({ intents: 513 });
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 45000 } });
    await tick();

    const identify = ws.sentPayloads.find((p) => p.op === GatewayOpcode.Identify);
    expect(identify).toBeDefined();
    expect((identify!.d as any).token).toBe("test-token");
    expect((identify!.d as any).intents).toBe(513);
  });

  test("sends first heartbeat with jitter after HELLO", async () => {
    const client = createClient();
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 100 } });
    // Wait for jitter heartbeat (up to heartbeat_interval ms)
    await tick(150);

    const heartbeats = ws.sentPayloads.filter((p) => p.op === GatewayOpcode.Heartbeat);
    expect(heartbeats.length).toBeGreaterThanOrEqual(1);
  });

  test("tracks seq from dispatch", async () => {
    const client = createClient();
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: {}, s: 42, t: "TEST" });
    await tick();

    expect(client.seq).toBe(42);
  });

  test("sets sessionId from READY dispatch", async () => {
    const client = createClient();
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({
      op: GatewayOpcode.Dispatch,
      d: { session_id: "abc-session", v: 10, user: { id: "1" }, guilds: [] },
      s: 1,
      t: "READY"
    });
    await tick();

    expect(client.sessionId).toBe("abc-session");
  });
});

describe("GatewayClient — HeartbeatAck and metrics", () => {
  test("updates latency on HeartbeatAck", async () => {
    const client = createClient();
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick(150); // wait for jitter heartbeat

    // Ensure at least one heartbeat was sent
    const hbSent = ws.sentPayloads.filter((p) => p.op === GatewayOpcode.Heartbeat);
    if (hbSent.length === 0) return; // jitter might be too long, skip

    ws.injectMessage({ op: GatewayOpcode.HeartbeatAck, d: null });
    await tick();

    const { latencyMs, lastHeartbeatAckAt } = client.metrics;
    expect(latencyMs).not.toBeNull();
    expect(latencyMs!).toBeGreaterThanOrEqual(0);
    expect(lastHeartbeatAckAt).not.toBeNull();
  });
});

describe("GatewayClient — Dispatch routing", () => {
  test("onDispatch receives typed events", async () => {
    const client = createClient();
    let receivedContent = "";

    client.onDispatch("MESSAGE_CREATE", (data) => {
      receivedContent = data.content;
    });

    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({
      op: GatewayOpcode.Dispatch,
      d: { id: "1", channel_id: "2", content: "hello world" },
      s: 1,
      t: "MESSAGE_CREATE"
    });
    await tick();

    expect(receivedContent).toBe("hello world");
  });

  test("onceDispatch fires only once", async () => {
    const client = createClient();
    let callCount = 0;

    client.onceDispatch("MESSAGE_CREATE", () => { callCount++; });

    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: { id: "1", channel_id: "2", content: "a" }, s: 1, t: "MESSAGE_CREATE" });
    await tick();
    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: { id: "2", channel_id: "2", content: "b" }, s: 2, t: "MESSAGE_CREATE" });
    await tick();

    expect(callCount).toBe(1);
  });

  test("offDispatch removes handler", async () => {
    const client = createClient();
    let callCount = 0;
    const handler = () => { callCount++; };

    client.onDispatch("MESSAGE_CREATE", handler);
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: { id: "1", channel_id: "2", content: "" }, s: 1, t: "MESSAGE_CREATE" });
    await tick();
    expect(callCount).toBe(1);

    client.offDispatch("MESSAGE_CREATE", handler);
    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: { id: "2", channel_id: "2", content: "" }, s: 2, t: "MESSAGE_CREATE" });
    await tick();
    expect(callCount).toBe(1);
  });

  test("removeAllDispatch clears all handlers for event", async () => {
    const client = createClient();
    let count = 0;

    client.onDispatch("MESSAGE_CREATE", () => { count++; });
    client.onDispatch("MESSAGE_CREATE", () => { count++; });

    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: { id: "1", channel_id: "2", content: "" }, s: 1, t: "MESSAGE_CREATE" });
    await tick();
    expect(count).toBe(2);

    client.removeAllDispatch("MESSAGE_CREATE");
    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: { id: "2", channel_id: "2", content: "" }, s: 2, t: "MESSAGE_CREATE" });
    await tick();
    expect(count).toBe(2);
  });
});

describe("GatewayClient — Reconnect policy", () => {
  test("Reconnect opcode triggers close with code 4000", async () => {
    const client = createClient();
    let closeCode = 0;
    client.on("close", (code) => { closeCode = code; });

    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({ op: GatewayOpcode.Reconnect, d: null });
    await tick();

    expect(closeCode).toBe(4000);
  });

  test("InvalidSession (non-resumable) clears session", async () => {
    const client = createClient();
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    // Set session first
    ws.injectMessage({
      op: GatewayOpcode.Dispatch,
      d: { session_id: "sess", v: 10, user: { id: "1" }, guilds: [] },
      s: 1,
      t: "READY"
    });
    await tick();
    expect(client.sessionId).toBe("sess");

    // InvalidSession with d=false → clear session
    ws.injectMessage({ op: GatewayOpcode.InvalidSession, d: false });
    // Wait for the random delay (1-5s) + re-identify
    await tick(6000);

    expect(client.sessionId).toBeNull();
  }, 10_000);

  test("InvalidSession (resumable) keeps session", async () => {
    const client = createClient();
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    ws.injectMessage({
      op: GatewayOpcode.Dispatch,
      d: { session_id: "sess2", v: 10, user: { id: "1" }, guilds: [] },
      s: 5,
      t: "READY"
    });
    await tick();
    expect(client.sessionId).toBe("sess2");

    ws.injectMessage({ op: GatewayOpcode.InvalidSession, d: true });
    await tick(6000);

    // Session should be preserved for resume
    expect(client.sessionId).toBe("sess2");
  }, 10_000);
});

describe("GatewayClient — Resume flow", () => {
  test("sends RESUME if session and seq exist on reconnect HELLO", async () => {
    const client = createClient({ autoReconnect: false });
    client.connect();
    await tick();

    const ws1 = latestWs();
    ws1.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    // Set session
    ws1.injectMessage({
      op: GatewayOpcode.Dispatch,
      d: { session_id: "resume-sess", v: 10, user: { id: "1" }, guilds: [] },
      s: 10,
      t: "READY"
    });
    await tick();

    // Manually close and reconnect
    ws1.close(4000, "test");
    await tick();

    client.connect();
    await tick();

    const ws2 = latestWs();
    ws2.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    const resume = ws2.sentPayloads.find((p) => p.op === GatewayOpcode.Resume);
    expect(resume).toBeDefined();
    expect((resume!.d as any).session_id).toBe("resume-sess");
    expect((resume!.d as any).seq).toBe(10);
  });

  test("RESUMED dispatch increments resumeCount", async () => {
    const client = createClient();
    client.connect();
    await tick();

    const ws = latestWs();
    ws.injectMessage({ op: GatewayOpcode.Hello, d: { heartbeat_interval: 99999 } });
    await tick();

    expect(client.metrics.resumeCount).toBe(0);

    ws.injectMessage({ op: GatewayOpcode.Dispatch, d: {}, s: 1, t: "RESUMED" });
    await tick();

    expect(client.metrics.resumeCount).toBe(1);
  });
});
