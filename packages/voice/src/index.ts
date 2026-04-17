import { sleep } from "@chordjs/utils";
import {
  VoiceOpcode,
  type Snowflake,
  type VoiceHello,
  type VoiceIdentify,
  type VoicePayload,
  type VoiceReady,
  type VoiceSelectProtocol,
  type VoiceSessionDescription,
  type VoiceSpeaking
} from "@chordjs/types";
import dgram from "node:dgram";
import crypto from "node:crypto";

export interface VoiceGatewayConnectOptions {
  endpoint: string; // e.g. "us-east123.discord.media"
  serverId: Snowflake;
  userId: Snowflake;
  sessionId: string;
  token: string;
}

export interface VoiceGatewayClientOptions {
  /**
   * Prefered encryption mode. Discord will provide supported modes in READY.
   */
  mode?: "aead_aes256_gcm_rtpsize";
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
}

type VoiceState = "idle" | "ws_open" | "hello" | "ready" | "udp_ready" | "session" | "closed";

export class VoiceGatewayClient {
  public readonly mode: "aead_aes256_gcm_rtpsize";
  public readonly autoReconnect: boolean;
  public readonly reconnectDelayMs: number;

  #state: VoiceState = "idle";
  #ws: WebSocket | null = null;
  #udp: dgram.Socket | null = null;
  #heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  #heartbeatIntervalMs: number | null = null;
  #seq = 0;

  #endpoint: string | null = null;
  #connect: VoiceGatewayConnectOptions | null = null;

  #ssrc: number | null = null;
  #udpIp: string | null = null;
  #udpPort: number | null = null;
  #secretKey: Uint8Array | null = null;

  // RTP state
  #rtpSequence = 0;
  #rtpTimestamp = 0;
  #nonce = 0;

  constructor(options: VoiceGatewayClientOptions = {}) {
    this.mode = options.mode ?? "aead_aes256_gcm_rtpsize";
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1000;
  }

  get state(): VoiceState {
    return this.#state;
  }

  get ssrc(): number | null {
    return this.#ssrc;
  }

  async connect(options: VoiceGatewayConnectOptions): Promise<void> {
    this.#connect = options;
    this.#endpoint = options.endpoint;
    this.#openWs();
  }

  close(code = 1000, reason = "Normal Closure"): void {
    this.#state = "closed";
    this.#stopHeartbeat();
    this.#ws?.close(code, reason);
    this.#ws = null;
    this.#udp?.close();
    this.#udp = null;
  }

  send(payload: VoicePayload): void {
    if (!this.#ws) throw new Error("VoiceGatewayClient: not connected");
    this.#ws.send(JSON.stringify(payload));
  }

  /**
   * Sends an OPUS frame (already encoded) over UDP (encrypted).
   */
  sendOpusFrame(opusFrame: Uint8Array): void {
    if (!this.#udp || !this.#udpIp || !this.#udpPort) throw new Error("VoiceGatewayClient: UDP not ready");
    if (!this.#secretKey) throw new Error("VoiceGatewayClient: session not ready");
    if (this.#ssrc === null) throw new Error("VoiceGatewayClient: missing SSRC");

    const packet = this.#encryptRtp(opusFrame, this.#secretKey);
    this.#udp.send(packet, this.#udpPort, this.#udpIp);
  }

  /**
   * Optional helper: update speaking flag.
   */
  setSpeaking(speaking: boolean): void {
    if (this.#ssrc === null) return;
    const payload: VoiceSpeaking = {
      op: VoiceOpcode.Speaking,
      d: { speaking: speaking ? 1 : 0, delay: 0, ssrc: this.#ssrc }
    };
    this.send(payload);
  }

  #openWs(): void {
    if (!this.#endpoint || !this.#connect) throw new Error("VoiceGatewayClient: missing endpoint/connect info");
    if (this.#ws) throw new Error("VoiceGatewayClient: already connected");

    this.#state = "ws_open";
    const url = `wss://${this.#endpoint}/?v=4`;
    const ws = new WebSocket(url);
    this.#ws = ws;

    ws.addEventListener("close", (ev: CloseEvent) => {
      this.#stopHeartbeat();
      this.#ws = null;
      this.#state = "closed";
      void this.#maybeReconnect(ev.code);
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      void this.#onMessage(ev.data);
    });
  }

  async #maybeReconnect(code: number): Promise<void> {
    if (!this.autoReconnect) return;
    if (!this.#connect) return;
    // For now: always reconnect after delay. Voice close codes can be added later.
    await sleep(this.reconnectDelayMs);
    if (this.#ws) return;
    this.#openWs();
  }

  async #onMessage(data: unknown): Promise<void> {
    try {
      const text = typeof data === "string" ? data : String(data);
      const payload = JSON.parse(text) as VoicePayload;
      await this.#onPayload(payload);
    } catch {
      // ignore malformed payloads for now
    }
  }

  async #onPayload(payload: VoicePayload): Promise<void> {
    this.#seq++;
    switch (payload.op) {
      case VoiceOpcode.Hello: {
        const hello = payload as VoiceHello;
        this.#state = "hello";
        this.#startHeartbeat(hello.d.heartbeat_interval);
        this.#sendIdentify();
        return;
      }
      case VoiceOpcode.Ready: {
        const ready = payload as VoiceReady;
        this.#state = "ready";
        this.#ssrc = ready.d.ssrc;

        // Prepare UDP and discovery
        const mode = ready.d.modes.includes(this.mode) ? this.mode : ready.d.modes[0];
        
        const { address, port } = await this.#udpDiscovery(ready.d.ip, ready.d.port, ready.d.ssrc);
        this.#udpIp = address;
        this.#udpPort = port;
        this.#state = "udp_ready";

        const select: VoiceSelectProtocol = {
          op: VoiceOpcode.SelectProtocol,
          d: { protocol: "udp", data: { address, port, mode } }
        };
        this.send(select);
        return;
      }
      case VoiceOpcode.SessionDescription: {
        const desc = payload as VoiceSessionDescription;
        this.#secretKey = new Uint8Array(desc.d.secret_key);
        this.#state = "session";
        return;
      }
      case VoiceOpcode.HeartbeatAck:
        return;
      default:
        return;
    }
  }

  #sendIdentify(): void {
    if (!this.#connect) throw new Error("VoiceGatewayClient: missing connect info");
    const identify: VoiceIdentify = {
      op: VoiceOpcode.Identify,
      d: {
        server_id: this.#connect.serverId,
        user_id: this.#connect.userId,
        session_id: this.#connect.sessionId,
        token: this.#connect.token
      }
    };
    this.send(identify);
  }

  #startHeartbeat(intervalMs: number): void {
    this.#stopHeartbeat();
    this.#heartbeatIntervalMs = intervalMs;
    this.send({ op: VoiceOpcode.Heartbeat, d: Date.now() });
    this.#heartbeatTimer = setInterval(() => {
      this.send({ op: VoiceOpcode.Heartbeat, d: Date.now() });
    }, intervalMs);
  }

  #stopHeartbeat(): void {
    if (this.#heartbeatTimer) clearInterval(this.#heartbeatTimer);
    this.#heartbeatTimer = null;
    this.#heartbeatIntervalMs = null;
  }

  async #udpDiscovery(ip: string, port: number, ssrc: number): Promise<{ address: string; port: number }> {
    const sock = dgram.createSocket("udp4");
    this.#udp?.close();
    this.#udp = sock;

    await new Promise<void>((resolve) => {
      sock.once("listening", resolve);
      sock.bind(0);
    });

    const packet = Buffer.alloc(70);
    packet.writeUInt16BE(0x1, 0);
    packet.writeUInt16BE(70, 2);
    packet.writeUInt32BE(ssrc >>> 0, 4);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        sock.removeAllListeners("message");
        reject(new Error("Voice UDP discovery timeout"));
      }, 5000);

      sock.once("message", (response) => {
        clearTimeout(timer);
        try {
          // Response: IP null-terminated string at offset 8, port at last 2 bytes
          const ipStart = 8;
          let ipEnd = ipStart;
          while (ipEnd < response.length && response[ipEnd] !== 0) ipEnd++;
          const address = response.subarray(ipStart, ipEnd).toString("utf8");
          const discoveredPort = response.readUInt16BE(response.length - 2);
          resolve({ address, port: discoveredPort });
        } catch (err) {
          reject(err);
        }
      });

      sock.send(packet, port, ip);
    });
  }

  #encryptRtp(opusFrame: Uint8Array, key: Uint8Array): Buffer {
    // RTP header (12 bytes)
    const header = Buffer.alloc(12);
    header[0] = 0x80;
    header[1] = 0x78; // payload type 120
    header.writeUInt16BE(this.#rtpSequence & 0xffff, 2);
    header.writeUInt32BE(this.#rtpTimestamp >>> 0, 4);
    header.writeUInt32BE((this.#ssrc ?? 0) >>> 0, 8);

    // Increment nonce
    const nonceValue = this.#nonce++;
    if (this.#nonce > 0xffffffff) this.#nonce = 0;

    const iv = Buffer.alloc(12);
    iv.writeUInt32BE(nonceValue, 0); // AEAD AES-GCM uses 12-byte IV. First 4 bytes are our incrementing nonce.

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    cipher.setAAD(header);

    const ciphertext = Buffer.concat([cipher.update(opusFrame), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const nonceBuffer = Buffer.alloc(4);
    nonceBuffer.writeUInt32BE(nonceValue, 0);

    // update RTP counters (48kHz, 20ms frames -> 960 samples)
    this.#rtpSequence = (this.#rtpSequence + 1) & 0xffff;
    this.#rtpTimestamp = (this.#rtpTimestamp + 960) >>> 0;

    return Buffer.concat([header, ciphertext, authTag, nonceBuffer]);
  }
}

