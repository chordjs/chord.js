import type { Snowflake } from "./shared.js";
import type { User, VoiceState, PresenceUpdate } from "./user.js";
import type { Guild, GuildMember, Emoji, Role } from "./guild.js";
import type { Channel } from "./channel.js";
import type { Message } from "./message.js";
import type { Interaction } from "./interaction.js";

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

export enum GatewayConnectionStatus {
  Disconnected = "Disconnected",
  Connecting = "Connecting",
  Connected = "Connected",
  Reconnecting = "Reconnecting",
  Resuming = "Resuming",
  Closing = "Closing"
}

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

// --- Dispatch Data ---

export interface ReadyDispatchData {
  v: number;
  user: User;
  guilds: Array<{ id: Snowflake; unavailable?: boolean }>;
  session_id: string;
  resume_gateway_url?: string;
  shard?: [number, number];
}

export interface ResumedDispatchData {}

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

export type InteractionCreateDispatchData = Interaction;

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

export type ChannelCreateDispatchData = Channel;
export type ChannelUpdateDispatchData = Channel;
export type ChannelDeleteDispatchData = Channel;

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

export type VoiceStateUpdateDispatchData = VoiceState;
export interface VoiceServerUpdateDispatchData {
  token: string;
  guild_id: Snowflake;
  endpoint: string | null;
}

export type PresenceUpdateDispatchData = PresenceUpdate;
export interface TypingStartDispatchData {
  channel_id: Snowflake;
  guild_id?: Snowflake;
  user_id: Snowflake;
  timestamp: number;
  member?: GuildMember;
}

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

// --- Other events ---
export type ThreadCreateDispatchData = any;
export type ThreadUpdateDispatchData = any;
export type ThreadDeleteDispatchData = any;
export type ThreadListSyncDispatchData = any;
export type ThreadMemberUpdateDispatchData = any;
export type ThreadMembersUpdateDispatchData = any;
export type ChannelPinsUpdateDispatchData = any;
export type GuildBanAddDispatchData = any;
export type GuildBanRemoveDispatchData = any;
export type GuildEmojisUpdateDispatchData = any;
export type GuildStickersUpdateDispatchData = any;
export type GuildIntegrationsUpdateDispatchData = any;
export type GuildAuditLogEntryCreateDispatchData = any;
export type WebhooksUpdateDispatchData = any;
export type InviteCreateDispatchData = any;
export type InviteDeleteDispatchData = any;
export type MessageReactionRemoveAllDispatchData = any;
export type MessageReactionRemoveEmojiDispatchData = any;
export type StageInstanceCreateDispatchData = any;
export type StageInstanceUpdateDispatchData = any;
export type StageInstanceDeleteDispatchData = any;
export type GuildScheduledEventCreateDispatchData = any;
export type GuildScheduledEventUpdateDispatchData = any;
export type GuildScheduledEventDeleteDispatchData = any;
export type GuildScheduledEventUserAddDispatchData = any;
export type GuildScheduledEventUserRemoveDispatchData = any;
export type AutoModerationRuleCreateDispatchData = any;
export type AutoModerationRuleUpdateDispatchData = any;
export type AutoModerationRuleDeleteDispatchData = any;
export type AutoModerationActionExecutionDispatchData = any;
export type EntitlementCreateDispatchData = any;
export type EntitlementUpdateDispatchData = any;
export type EntitlementDeleteDispatchData = any;
export type MessagePollVoteAddDispatchData = any;
export type MessagePollVoteRemoveDispatchData = any;

export interface GatewayDispatchDataMap {
  READY: ReadyDispatchData;
  RESUMED: ResumedDispatchData;
  GUILD_CREATE: GuildCreateDispatchData;
  GUILD_UPDATE: GuildUpdateDispatchData;
  GUILD_DELETE: GuildDeleteDispatchData;
  GUILD_MEMBER_ADD: GuildMemberAddDispatchData;
  GUILD_MEMBER_REMOVE: GuildMemberRemoveDispatchData;
  GUILD_MEMBER_UPDATE: GuildMemberUpdateDispatchData;
  GUILD_ROLE_CREATE: GuildRoleCreateDispatchData;
  GUILD_ROLE_UPDATE: GuildRoleUpdateDispatchData;
  GUILD_ROLE_DELETE: GuildRoleDeleteDispatchData;
  CHANNEL_CREATE: ChannelCreateDispatchData;
  CHANNEL_UPDATE: ChannelUpdateDispatchData;
  CHANNEL_DELETE: ChannelDeleteDispatchData;
  MESSAGE_CREATE: MessageCreateDispatchData;
  MESSAGE_UPDATE: MessageUpdateDispatchData;
  MESSAGE_DELETE: MessageDeleteDispatchData;
  MESSAGE_DELETE_BULK: MessageDeleteBulkDispatchData;
  MESSAGE_REACTION_ADD: MessageReactionAddDispatchData;
  MESSAGE_REACTION_REMOVE: MessageReactionRemoveDispatchData;
  INTERACTION_CREATE: InteractionCreateDispatchData;
  VOICE_STATE_UPDATE: VoiceStateUpdateDispatchData;
  VOICE_SERVER_UPDATE: VoiceServerUpdateDispatchData;
  PRESENCE_UPDATE: PresenceUpdateDispatchData;
  TYPING_START: TypingStartDispatchData;
  THREAD_CREATE: ThreadCreateDispatchData;
  THREAD_UPDATE: ThreadUpdateDispatchData;
  THREAD_DELETE: ThreadDeleteDispatchData;
  THREAD_LIST_SYNC: ThreadListSyncDispatchData;
  THREAD_MEMBER_UPDATE: ThreadMemberUpdateDispatchData;
  THREAD_MEMBERS_UPDATE: ThreadMembersUpdateDispatchData;
  CHANNEL_PINS_UPDATE: ChannelPinsUpdateDispatchData;
  GUILD_BAN_ADD: GuildBanAddDispatchData;
  GUILD_BAN_REMOVE: GuildBanRemoveDispatchData;
  GUILD_EMOJIS_UPDATE: GuildEmojisUpdateDispatchData;
  GUILD_STICKERS_UPDATE: GuildStickersUpdateDispatchData;
  GUILD_INTEGRATIONS_UPDATE: GuildIntegrationsUpdateDispatchData;
  GUILD_AUDIT_LOG_ENTRY_CREATE: GuildAuditLogEntryCreateDispatchData;
  WEBHOOKS_UPDATE: WebhooksUpdateDispatchData;
  INVITE_CREATE: InviteCreateDispatchData;
  INVITE_DELETE: InviteDeleteDispatchData;
  MESSAGE_REACTION_REMOVE_ALL: MessageReactionRemoveAllDispatchData;
  MESSAGE_REACTION_REMOVE_EMOJI: MessageReactionRemoveEmojiDispatchData;
  STAGE_INSTANCE_CREATE: StageInstanceCreateDispatchData;
  STAGE_INSTANCE_UPDATE: StageInstanceUpdateDispatchData;
  STAGE_INSTANCE_DELETE: StageInstanceDeleteDispatchData;
  GUILD_SCHEDULED_EVENT_CREATE: GuildScheduledEventCreateDispatchData;
  GUILD_SCHEDULED_EVENT_UPDATE: GuildScheduledEventUpdateDispatchData;
  GUILD_SCHEDULED_EVENT_DELETE: GuildScheduledEventDeleteDispatchData;
  GUILD_SCHEDULED_EVENT_USER_ADD: GuildScheduledEventUserAddDispatchData;
  GUILD_SCHEDULED_EVENT_USER_REMOVE: GuildScheduledEventUserRemoveDispatchData;
  AUTO_MODERATION_RULE_CREATE: AutoModerationRuleCreateDispatchData;
  AUTO_MODERATION_RULE_UPDATE: AutoModerationRuleUpdateDispatchData;
  AUTO_MODERATION_RULE_DELETE: AutoModerationRuleDeleteDispatchData;
  AUTO_MODERATION_ACTION_EXECUTION: AutoModerationActionExecutionDispatchData;
  ENTITLEMENT_CREATE: EntitlementCreateDispatchData;
  ENTITLEMENT_UPDATE: EntitlementUpdateDispatchData;
  ENTITLEMENT_DELETE: EntitlementDeleteDispatchData;
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
