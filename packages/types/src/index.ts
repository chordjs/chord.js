export type Snowflake = string;

export type GatewayIntentBits = number;
export const GatewayIntent = {
  Guilds: 1 << 0,
  GuildMembers: 1 << 1,
  GuildModeration: 1 << 2,
  GuildExpressions: 1 << 3,
  GuildIntegrations: 1 << 4,
  GuildWebhooks: 1 << 5,
  GuildInvites: 1 << 6,
  GuildVoiceStates: 1 << 7,
  GuildPresences: 1 << 8,
  GuildMessages: 1 << 9,
  GuildMessageReactions: 1 << 10,
  GuildMessageTyping: 1 << 11,
  DirectMessages: 1 << 12,
  DirectMessageReactions: 1 << 13,
  DirectMessageTyping: 1 << 14,
  MessageContent: 1 << 15,
  GuildScheduledEvents: 1 << 16,
  AutoModerationConfiguration: 1 << 20,
  AutoModerationExecution: 1 << 21,
  GuildMessagePolls: 1 << 24,
  DirectMessagePolls: 1 << 25
} as const;

export type GatewayIntentName = keyof typeof GatewayIntent;
export type GatewayIntentResolvable = GatewayIntentBits | GatewayIntentName[] | ReadonlyArray<GatewayIntentName>;

export function resolveGatewayIntents(input: GatewayIntentResolvable): GatewayIntentBits {
  if (typeof input === "number") return input;
  let bits = 0;
  for (const name of input) bits |= GatewayIntent[name];
  return bits;
}

export type {
  ActionRowComponent,
  APIAllowedMentions,
  APIEmbed,
  APIMessageReference,
  APIMessageTopLevelComponent,
  ApplicationCommand,
  ApplicationCommandOption,
  ButtonComponent,
  Channel,
  ChannelType,
  Emoji,
  Guild,
  GuildMember,
  Interaction,
  InteractionType,
  Message,
  MessageComponent,
  MessageFlags,
  MessageReaction,
  PermissionOverwrite,
  PresenceActivity,
  PresenceUpdate,
  Role,
  SelectMenuComponent,
  SelectMenuOption,
  Sticker,
  TextInputComponent,
  User,
  VoiceState
} from "./discord-api.js";
export { ChannelTypes, InteractionTypes } from "./discord-api.js";
import type { User, Message, Interaction, Guild, Channel, GuildMember, VoiceState, PresenceUpdate, Emoji, Role } from "./discord-api.js";

export const GatewayOpcode = {
  Dispatch: 0,
  Heartbeat: 1,
  Identify: 2,
  PresenceUpdate: 3,
  VoiceStateUpdate: 4,
  Resume: 6,
  Reconnect: 7,
  RequestGuildMembers: 8,
  InvalidSession: 9,
  Hello: 10,
  HeartbeatAck: 11
} as const;

export type GatewayOpcode = (typeof GatewayOpcode)[keyof typeof GatewayOpcode];

export interface GatewayEnvelope<TOp extends GatewayOpcode = GatewayOpcode, TD = unknown> {
  op: TOp;
  d: TD;
  s?: number;
  t?: string;
}

export interface GatewayHelloData {
  heartbeat_interval: number;
}

export type GatewayHello = GatewayEnvelope<typeof GatewayOpcode.Hello, GatewayHelloData>;

export type GatewayHeartbeat = GatewayEnvelope<typeof GatewayOpcode.Heartbeat, number | null>;

export type GatewayStatus = "online" | "dnd" | "idle" | "invisible" | "offline";

export type GatewayActivityType = 0 | 1 | 2 | 3 | 4 | 5;

export interface GatewayActivity {
  name: string;
  type: GatewayActivityType;
  url?: string | null;
}

export interface GatewayPresence {
  since: number | null;
  activities: GatewayActivity[];
  status: GatewayStatus;
  afk: boolean;
}

export interface GatewayIdentifyData {
  token: string;
  intents: GatewayIntentBits;
  properties: Record<string, string>;
  presence?: GatewayPresence;
  compress?: boolean;
  large_threshold?: number;
  shard?: [number, number];
}

export type GatewayIdentify = GatewayEnvelope<typeof GatewayOpcode.Identify, GatewayIdentifyData>;

export interface GatewayResumeData {
  token: string;
  session_id: string;
  seq: number;
}

export type GatewayResume = GatewayEnvelope<typeof GatewayOpcode.Resume, GatewayResumeData>;

// -----------------------------
// Gateway dispatch events
// -----------------------------

export interface ReadyDispatchData {
  v: number;
  user: User;
  guilds: Array<{ id: Snowflake; unavailable?: boolean }>;
  session_id: string;
  resume_gateway_url?: string;
  shard?: [number, number];
}

export interface ResumedDispatchData {}

// --- Message events ---

export type MessageCreateDispatchData = Message;
export type MessageUpdateDispatchData = Partial<Message> & { id: Snowflake; channel_id: Snowflake };
export interface MessageDeleteDispatchData {
  id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
}
export interface MessageDeleteBulkDispatchData {
  ids: Snowflake[];
  channel_id: Snowflake;
  guild_id?: Snowflake;
}

// --- Interaction ---

export type InteractionCreateDispatchData = Interaction;

// --- Guild events ---

export type GuildCreateDispatchData = Guild & {
  joined_at?: string;
  large?: boolean;
  member_count?: number;
  members?: GuildMember[];
  channels?: Channel[];
  voice_states?: VoiceState[];
  presences?: PresenceUpdate[];
};
export type GuildUpdateDispatchData = Guild;
export interface GuildDeleteDispatchData {
  id: Snowflake;
  unavailable?: boolean;
}

// --- Guild Member events ---

export interface GuildMemberAddDispatchData extends GuildMember {
  guild_id: Snowflake;
}
export interface GuildMemberRemoveDispatchData {
  guild_id: Snowflake;
  user: User;
}
export interface GuildMemberUpdateDispatchData {
  guild_id: Snowflake;
  roles: Snowflake[];
  user: User;
  nick?: string | null;
  avatar?: string | null;
  joined_at?: string | null;
  premium_since?: string | null;
  pending?: boolean;
  communication_disabled_until?: string | null;
}

// --- Channel events ---

export type ChannelCreateDispatchData = Channel;
export type ChannelUpdateDispatchData = Channel;
export type ChannelDeleteDispatchData = Channel;

// --- Reaction events ---

export interface MessageReactionAddDispatchData {
  user_id: Snowflake;
  channel_id: Snowflake;
  message_id: Snowflake;
  guild_id?: Snowflake;
  member?: GuildMember;
  emoji: Emoji;
}
export interface MessageReactionRemoveDispatchData {
  user_id: Snowflake;
  channel_id: Snowflake;
  message_id: Snowflake;
  guild_id?: Snowflake;
  emoji: Emoji;
}

// --- Voice events ---

export type VoiceStateUpdateDispatchData = VoiceState;
export interface VoiceServerUpdateDispatchData {
  token: string;
  guild_id: Snowflake;
  endpoint: string | null;
}

// --- Presence / Typing ---

export type PresenceUpdateDispatchData = PresenceUpdate;
export interface TypingStartDispatchData {
  channel_id: Snowflake;
  guild_id?: Snowflake;
  user_id: Snowflake;
  timestamp: number;
  member?: GuildMember;
}

// --- Guild Role events ---

export interface GuildRoleCreateDispatchData {
  guild_id: Snowflake;
  role: Role;
}
export interface GuildRoleUpdateDispatchData {
  guild_id: Snowflake;
  role: Role;
}
export interface GuildRoleDeleteDispatchData {
  guild_id: Snowflake;
  role_id: Snowflake;
}

// ===========================================
// Dispatch Data Map
// ===========================================

export interface GatewayDispatchDataMap {
  // Core lifecycle
  READY: ReadyDispatchData;
  RESUMED: ResumedDispatchData;

  // Guild
  GUILD_CREATE: GuildCreateDispatchData;
  GUILD_UPDATE: GuildUpdateDispatchData;
  GUILD_DELETE: GuildDeleteDispatchData;

  // Guild Member
  GUILD_MEMBER_ADD: GuildMemberAddDispatchData;
  GUILD_MEMBER_REMOVE: GuildMemberRemoveDispatchData;
  GUILD_MEMBER_UPDATE: GuildMemberUpdateDispatchData;

  // Guild Role
  GUILD_ROLE_CREATE: GuildRoleCreateDispatchData;
  GUILD_ROLE_UPDATE: GuildRoleUpdateDispatchData;
  GUILD_ROLE_DELETE: GuildRoleDeleteDispatchData;

  // Channel
  CHANNEL_CREATE: ChannelCreateDispatchData;
  CHANNEL_UPDATE: ChannelUpdateDispatchData;
  CHANNEL_DELETE: ChannelDeleteDispatchData;

  // Message
  MESSAGE_CREATE: MessageCreateDispatchData;
  MESSAGE_UPDATE: MessageUpdateDispatchData;
  MESSAGE_DELETE: MessageDeleteDispatchData;
  MESSAGE_DELETE_BULK: MessageDeleteBulkDispatchData;

  // Reaction
  MESSAGE_REACTION_ADD: MessageReactionAddDispatchData;
  MESSAGE_REACTION_REMOVE: MessageReactionRemoveDispatchData;

  // Interaction
  INTERACTION_CREATE: InteractionCreateDispatchData;

  // Voice
  VOICE_STATE_UPDATE: VoiceStateUpdateDispatchData;
  VOICE_SERVER_UPDATE: VoiceServerUpdateDispatchData;

  // Presence / Typing
  PRESENCE_UPDATE: PresenceUpdateDispatchData;
  TYPING_START: TypingStartDispatchData;
}

export type GatewayDispatchEvent = keyof GatewayDispatchDataMap;

export type GatewayDispatch<TEvent extends string = string, TData = unknown> = GatewayEnvelope<typeof GatewayOpcode.Dispatch, TData> & {
  t: TEvent;
};

export type GatewayInvalidSession = GatewayEnvelope<typeof GatewayOpcode.InvalidSession, boolean>;

export type GatewayReconnect = GatewayEnvelope<typeof GatewayOpcode.Reconnect, null>;

export type GatewayHeartbeatAck = GatewayEnvelope<typeof GatewayOpcode.HeartbeatAck, null>;

export type GatewayPayload =
  | GatewayHello
  | GatewayHeartbeat
  | GatewayIdentify
  | GatewayResume
  | GatewayDispatch<GatewayDispatchEvent, GatewayDispatchDataMap[GatewayDispatchEvent]>
  | GatewayDispatch<string, unknown>
  | GatewayInvalidSession
  | GatewayReconnect
  | GatewayHeartbeatAck
  | GatewayEnvelope;

// =============================
// Voice Gateway (minimal)
// =============================

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
