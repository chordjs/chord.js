import type { Snowflake } from "./shared.js";

export const VoiceOpcode = {
  Identify: 0,
  SelectProtocol: 1,
  Ready: 2,
  Heartbeat: 3,
  SessionDescription: 4,
  Speaking: 5,
  HeartbeatAck: 6,
  Resume: 7,
  Hello: 8,
  Resumed: 9,
  ClientDisconnect: 13
} as const;

export type VoiceOpcode = (typeof VoiceOpcode)[keyof typeof VoiceOpcode];

export interface VoiceEnvelope<TOp extends VoiceOpcode = VoiceOpcode, TD = unknown> {
  op: TOp;
  d: TD;
  seq?: number;
}

export interface VoiceHelloData {
  heartbeat_interval: number;
}

export type VoiceHello = VoiceEnvelope<typeof VoiceOpcode.Hello, VoiceHelloData>;

export interface VoiceIdentifyData {
  server_id: Snowflake;
  user_id: Snowflake;
  session_id: string;
  token: string;
}

export type VoiceIdentify = VoiceEnvelope<typeof VoiceOpcode.Identify, VoiceIdentifyData>;

export interface VoiceReadyData {
  ssrc: number;
  ip: string;
  port: number;
  modes: string[];
}

export type VoiceReady = VoiceEnvelope<typeof VoiceOpcode.Ready, VoiceReadyData>;

export interface VoiceSelectProtocolData {
  protocol: "udp";
  data: {
    address: string;
    port: number;
    mode: string;
  };
}

export type VoiceSelectProtocol = VoiceEnvelope<typeof VoiceOpcode.SelectProtocol, VoiceSelectProtocolData>;

export interface VoiceSessionDescriptionData {
  mode: string;
  secret_key: number[];
}

export type VoiceSessionDescription = VoiceEnvelope<typeof VoiceOpcode.SessionDescription, VoiceSessionDescriptionData>;

export type VoiceHeartbeat = VoiceEnvelope<typeof VoiceOpcode.Heartbeat, number>;

export type VoiceHeartbeatAck = VoiceEnvelope<typeof VoiceOpcode.HeartbeatAck, number>;

export interface VoiceSpeakingData {
  speaking: number;
  delay: number;
  ssrc: number;
}

export type VoiceSpeaking = VoiceEnvelope<typeof VoiceOpcode.Speaking, VoiceSpeakingData>;

export type VoicePayload =
  | VoiceHello
  | VoiceIdentify
  | VoiceReady
  | VoiceSelectProtocol
  | VoiceSessionDescription
  | VoiceHeartbeat
  | VoiceHeartbeatAck
  | VoiceSpeaking
  | VoiceEnvelope;
