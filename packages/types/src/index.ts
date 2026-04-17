export type Snowflake = string;

export type GatewayIntentBits = number;
export const GatewayIntentBits = {
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

export type GatewayIntentName = keyof typeof GatewayIntentBits;
export type GatewayIntentResolvable = GatewayIntentBits | GatewayIntentName[] | ReadonlyArray<GatewayIntentName>;

export function resolveGatewayIntents(input: GatewayIntentResolvable): GatewayIntentBits {
  if (typeof input === "number") return input;
  let bits = 0;
  for (const name of input) bits |= GatewayIntentBits[name];
  return bits;
}

export type {
  ActionRowComponent,
  APIAllowedMentions,
  APIEmbed,
  APIMessageReference,
  APIMessageTopLevelComponent,
  APIInteractionResponseCallbackData,
  APIModalInteractionResponseCallbackData,
  ApplicationCommand,
  ApplicationCommandOption,
  AuditLog,
  AuditLogEntry,
  AuditLogChange,
  AutoModerationRule,
  AutoModerationAction,
  Ban,
  Invite,
  InviteMetadata,
  Poll,
  PollMedia,
  PollAnswer,
  PollResults,
  PollAnswerCount,
  ButtonComponent,
  Channel,
  ChannelType,
  Emoji,
  Guild,
  GuildMember,
  Interaction,
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
  VoiceState,
  ThreadMetadata,
  ForumTag
} from "./discord-api.js";
export { ChannelTypes, InteractionType, ComponentType } from "./discord-api.js";

export const ButtonStyle = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5
} as const;

export const ApplicationCommandType = {
  ChatInput: 1,
  User: 2,
  Message: 3
} as const;

export const ApplicationCommandOptionType = {
  SubCommand: 1,
  SubCommandGroup: 2,
  String: 3,
  Integer: 4,
  Boolean: 5,
  User: 6,
  Channel: 7,
  Role: 8,
  Mentionable: 9,
  Number: 10,
  Attachment: 11
} as const;
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

// --- Thread events ---
export type ThreadCreateDispatchData = any;
export type ThreadUpdateDispatchData = any;
export type ThreadDeleteDispatchData = any;
export type ThreadListSyncDispatchData = any;
export type ThreadMemberUpdateDispatchData = any;
export type ThreadMembersUpdateDispatchData = any;

// --- Other Channel events ---
export type ChannelPinsUpdateDispatchData = any;

// --- Other Guild events ---
export type GuildBanAddDispatchData = any;
export type GuildBanRemoveDispatchData = any;
export type GuildEmojisUpdateDispatchData = any;
export type GuildStickersUpdateDispatchData = any;
export type GuildIntegrationsUpdateDispatchData = any;
export type GuildAuditLogEntryCreateDispatchData = any;

// --- Webhooks ---
export type WebhooksUpdateDispatchData = any;

// --- Invites ---
export type InviteCreateDispatchData = any;
export type InviteDeleteDispatchData = any;

// --- More Reaction events ---
export type MessageReactionRemoveAllDispatchData = any;
export type MessageReactionRemoveEmojiDispatchData = any;

// --- Stage Instances ---
export type StageInstanceCreateDispatchData = any;
export type StageInstanceUpdateDispatchData = any;
export type StageInstanceDeleteDispatchData = any;

// --- Scheduled Events ---
export type GuildScheduledEventCreateDispatchData = any;
export type GuildScheduledEventUpdateDispatchData = any;
export type GuildScheduledEventDeleteDispatchData = any;
export type GuildScheduledEventUserAddDispatchData = any;
export type GuildScheduledEventUserRemoveDispatchData = any;

// --- Auto Moderation ---
export type AutoModerationRuleCreateDispatchData = any;
export type AutoModerationRuleUpdateDispatchData = any;
export type AutoModerationRuleDeleteDispatchData = any;
export type AutoModerationActionExecutionDispatchData = any;

// --- Entitlements ---
export type EntitlementCreateDispatchData = any;
export type EntitlementUpdateDispatchData = any;
export type EntitlementDeleteDispatchData = any;

// --- Message Polls ---
export type MessagePollVoteAddDispatchData = any;
export type MessagePollVoteRemoveDispatchData = any;

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

  // Threads
  THREAD_CREATE: ThreadCreateDispatchData;
  THREAD_UPDATE: ThreadUpdateDispatchData;
  THREAD_DELETE: ThreadDeleteDispatchData;
  THREAD_LIST_SYNC: ThreadListSyncDispatchData;
  THREAD_MEMBER_UPDATE: ThreadMemberUpdateDispatchData;
  THREAD_MEMBERS_UPDATE: ThreadMembersUpdateDispatchData;

  // Other Channel
  CHANNEL_PINS_UPDATE: ChannelPinsUpdateDispatchData;

  // Other Guild
  GUILD_BAN_ADD: GuildBanAddDispatchData;
  GUILD_BAN_REMOVE: GuildBanRemoveDispatchData;
  GUILD_EMOJIS_UPDATE: GuildEmojisUpdateDispatchData;
  GUILD_STICKERS_UPDATE: GuildStickersUpdateDispatchData;
  GUILD_INTEGRATIONS_UPDATE: GuildIntegrationsUpdateDispatchData;
  GUILD_AUDIT_LOG_ENTRY_CREATE: GuildAuditLogEntryCreateDispatchData;

  // Webhooks & Invites
  WEBHOOKS_UPDATE: WebhooksUpdateDispatchData;
  INVITE_CREATE: InviteCreateDispatchData;
  INVITE_DELETE: InviteDeleteDispatchData;

  // Reactions
  MESSAGE_REACTION_REMOVE_ALL: MessageReactionRemoveAllDispatchData;
  MESSAGE_REACTION_REMOVE_EMOJI: MessageReactionRemoveEmojiDispatchData;

  // Stage Instances
  STAGE_INSTANCE_CREATE: StageInstanceCreateDispatchData;
  STAGE_INSTANCE_UPDATE: StageInstanceUpdateDispatchData;
  STAGE_INSTANCE_DELETE: StageInstanceDeleteDispatchData;

  // Scheduled Events
  GUILD_SCHEDULED_EVENT_CREATE: GuildScheduledEventCreateDispatchData;
  GUILD_SCHEDULED_EVENT_UPDATE: GuildScheduledEventUpdateDispatchData;
  GUILD_SCHEDULED_EVENT_DELETE: GuildScheduledEventDeleteDispatchData;
  GUILD_SCHEDULED_EVENT_USER_ADD: GuildScheduledEventUserAddDispatchData;
  GUILD_SCHEDULED_EVENT_USER_REMOVE: GuildScheduledEventUserRemoveDispatchData;

  // Auto Moderation
  AUTO_MODERATION_RULE_CREATE: AutoModerationRuleCreateDispatchData;
  AUTO_MODERATION_RULE_UPDATE: AutoModerationRuleUpdateDispatchData;
  AUTO_MODERATION_RULE_DELETE: AutoModerationRuleDeleteDispatchData;
  AUTO_MODERATION_ACTION_EXECUTION: AutoModerationActionExecutionDispatchData;

  // Entitlements
  ENTITLEMENT_CREATE: EntitlementCreateDispatchData;
  ENTITLEMENT_UPDATE: EntitlementUpdateDispatchData;
  ENTITLEMENT_DELETE: EntitlementDeleteDispatchData;

  // Message Polls
  MESSAGE_POLL_VOTE_ADD: MessagePollVoteAddDispatchData;
  MESSAGE_POLL_VOTE_REMOVE: MessagePollVoteRemoveDispatchData;
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
