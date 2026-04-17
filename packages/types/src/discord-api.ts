export type Snowflake = string;

// ============================================================
// Discord API resource types (hand-maintained)
// ============================================================

export type ChannelType = number;

export const ChannelTypes = {
  GuildText: 0,
  DM: 1,
  GuildVoice: 2,
  GroupDM: 3,
  GuildCategory: 4,
  GuildAnnouncement: 5,
  AnnouncementThread: 10,
  PublicThread: 11,
  PrivateThread: 12,
  GuildStageVoice: 13,
  GuildDirectory: 14,
  GuildForum: 15,
  GuildMedia: 16
} as const;

// --- User ---

export interface User {
  id: Snowflake;
  username?: string;
  discriminator?: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
  system?: boolean;
  banner?: string | null;
  accent_color?: number | null;
  locale?: string;
  flags?: number;
  public_flags?: number;
}

// --- Role ---

export interface Role {
  id: Snowflake;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

// --- Emoji ---

export interface Emoji {
  id: Snowflake | null;
  name: string | null;
  roles?: Snowflake[];
  user?: User;
  require_colons?: boolean;
  managed?: boolean;
  animated?: boolean;
  available?: boolean;
}

// --- Sticker ---

export interface Sticker {
  id: Snowflake;
  name: string;
  description: string | null;
  type: number;
  format_type: number;
  guild_id?: Snowflake;
}

// --- GuildMember ---

export interface GuildMember {
  user?: User;
  nick?: string | null;
  avatar?: string | null;
  roles: Snowflake[];
  joined_at: string;
  premium_since?: string | null;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string | null;
}

// --- Guild ---

export interface Guild {
  id: Snowflake;
  name?: string;
  icon?: string | null;
  splash?: string | null;
  owner_id?: Snowflake;
  permissions?: string;
  region?: string;
  afk_channel_id?: Snowflake | null;
  afk_timeout?: number;
  verification_level?: number;
  default_message_notifications?: number;
  roles?: Role[];
  emojis?: Emoji[];
  features?: string[];
  member_count?: number;
  max_members?: number;
  preferred_locale?: string;
  unavailable?: boolean;
}

// --- Channel ---

export interface Channel {
  id: Snowflake;
  type?: ChannelType;
  guild_id?: Snowflake;
  name?: string | null;
  topic?: string | null;
  nsfw?: boolean;
  position?: number;
  permission_overwrites?: PermissionOverwrite[];
  parent_id?: Snowflake | null;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  last_message_id?: Snowflake | null;
  thread_metadata?: ThreadMetadata;
  message_count?: number;
  member_count?: number;
  available_tags?: ForumTag[];
  applied_tags?: Snowflake[];
  default_auto_archive_duration?: number;
}

export interface ThreadMetadata {
  archived: boolean;
  auto_archive_duration: number;
  archive_timestamp: string;
  locked: boolean;
  invitable?: boolean;
  create_timestamp?: string | null;
}

export interface ForumTag {
  id: Snowflake;
  name: string;
  moderated: boolean;
  emoji_id: Snowflake | null;
  emoji_name: string | null;
}

export interface PermissionOverwrite {
  id: Snowflake;
  type: number; // 0 = role, 1 = member
  allow: string;
  deny: string;
}

// --- Message ---

export interface Message {
  id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  content: string;
  author?: User;
  member?: GuildMember;
  timestamp?: string;
  edited_timestamp?: string | null;
  tts?: boolean;
  mention_everyone?: boolean;
  mentions?: User[];
  mention_roles?: Snowflake[];
  embeds?: APIEmbed[];
  reactions?: MessageReaction[];
  pinned?: boolean;
  type?: number;
  flags?: number;
  referenced_message?: Message | null;
  components?: APIMessageTopLevelComponent[];
  sticker_items?: Array<{ id: Snowflake; name: string; format_type: number }>;
  poll?: Poll;
}

export interface MessageReaction {
  count: number;
  me: boolean;
  emoji: Emoji;
}

// --- Interaction ---

export type InteractionType = number;

export const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
  MessageComponent: 3,
  ApplicationCommandAutocomplete: 4,
  ModalSubmit: 5
} as const;

export interface Interaction {
  id: Snowflake;
  application_id?: Snowflake;
  type: InteractionType;
  token?: string;
  guild_id?: Snowflake;
  channel_id?: Snowflake;
  member?: GuildMember;
  user?: User;
  data?: Record<string, unknown>;
  message?: Message;
}

// --- VoiceState ---

export interface VoiceState {
  guild_id?: Snowflake;
  channel_id: Snowflake | null;
  user_id: Snowflake;
  member?: GuildMember;
  session_id: string;
  deaf: boolean;
  mute: boolean;
  self_deaf: boolean;
  self_mute: boolean;
  self_stream?: boolean;
  self_video: boolean;
  suppress: boolean;
  request_to_speak_timestamp?: string | null;
}

// --- Presence ---

export interface PresenceActivity {
  name: string;
  type: number;
  url?: string | null;
  state?: string | null;
}

export interface PresenceUpdate {
  user: { id: Snowflake } & Partial<User>;
  guild_id?: Snowflake;
  status: string;
  activities: PresenceActivity[];
  client_status?: {
    desktop?: string;
    mobile?: string;
    web?: string;
  };
}

// --- ApplicationCommand ---

export interface ApplicationCommand {
  id: Snowflake;
  application_id: Snowflake;
  guild_id?: Snowflake;
  name: string;
  description: string;
  type?: number;
  options?: ApplicationCommandOption[];
  default_member_permissions?: string | null;
  dm_permission?: boolean | null;
  nsfw?: boolean;
  version: Snowflake;
}

export interface ApplicationCommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  options?: ApplicationCommandOption[];
  autocomplete?: boolean;
}

// --- Message Components ---

export type ComponentType = number;

export const ComponentType = {
  ActionRow: 1,
  Button: 2,
  StringSelect: 3,
  TextInput: 4,
  UserSelect: 5,
  RoleSelect: 6,
  MentionableSelect: 7,
  ChannelSelect: 8
} as const;

export interface ActionRowComponent {
  type: 1;
  components: MessageComponent[];
}

export type MessageComponent = ButtonComponent | SelectMenuComponent | TextInputComponent;

export interface ButtonComponent {
  type: 2;
  style: number;
  label?: string;
  emoji?: Partial<Emoji>;
  custom_id?: string;
  url?: string;
  disabled?: boolean;
}

export interface SelectMenuComponent {
  type: 3 | 5 | 6 | 7 | 8; // string, user, role, mentionable, channel
  custom_id: string;
  options?: SelectMenuOption[];
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  disabled?: boolean;
}

export interface SelectMenuOption {
  label: string;
  value: string;
  description?: string;
  emoji?: Partial<Emoji>;
  default?: boolean;
}

export interface TextInputComponent {
  type: 4;
  custom_id: string;
  style: number;
  label: string;
  min_length?: number;
  max_length?: number;
  required?: boolean;
  value?: string;
  placeholder?: string;
}

// --- Audit Log ---

export interface AuditLog {
  audit_log_entries: AuditLogEntry[];
  users: User[];
  integrations: any[];
  webhooks: any[];
  application_commands: ApplicationCommand[];
  auto_moderation_rules: any[];
  guild_scheduled_events: any[];
  threads: Channel[];
}

export interface AuditLogEntry {
  target_id: string | null;
  changes?: AuditLogChange[];
  user_id: Snowflake | null;
  id: Snowflake;
  action_type: number;
  options?: any;
  reason?: string;
}

export interface AuditLogChange {
  new_value?: any;
  old_value?: any;
  key: string;
}

// --- Ban ---

export interface Ban {
  reason: string | null;
  user: User;
}

// --- Invite ---

export interface Invite {
  code: string;
  guild?: Partial<Guild>;
  channel?: Partial<Channel> | null;
  inviter?: User;
  target_type?: number;
  target_user?: User;
  target_application?: any;
  approximate_presence_count?: number;
  approximate_member_count?: number;
  expires_at?: string | null;
  guild_scheduled_event?: any;
}

export interface InviteMetadata extends Invite {
  uses: number;
  max_uses: number;
  max_age: number;
  temporary: boolean;
  created_at: string;
}

// --- Auto Moderation ---

export interface AutoModerationRule {
  id: Snowflake;
  guild_id: Snowflake;
  name: string;
  creator_id: Snowflake;
  event_type: number;
  trigger_type: number;
  trigger_metadata: any;
  actions: AutoModerationAction[];
  enabled: boolean;
  exempt_roles: Snowflake[];
  exempt_channels: Snowflake[];
}

export interface AutoModerationAction {
  type: number;
  metadata?: any;
}

// --- Polls ---

export interface Poll {
  question: PollMedia;
  answers: PollAnswer[];
  expiry?: string;
  allow_multiselect: boolean;
  layout_type: number;
  results?: PollResults;
}

export interface PollMedia {
  text?: string;
  emoji?: Partial<Emoji>;
}

export interface PollAnswer {
  answer_id: number;
  poll_media: PollMedia;
}

export interface PollResults {
  is_finalized: boolean;
  answer_counts: PollAnswerCount[];
}

export interface PollAnswerCount {
  id: number;
  count: number;
  me_voted: boolean;
}

// ============================================================
// REST payload helpers used by the core framework
// ============================================================

export type MessageFlags = number;

export interface APIAllowedMentions {
  parse?: Array<"roles" | "users" | "everyone">;
  roles?: Snowflake[];
  users?: Snowflake[];
  replied_user?: boolean;
}

export interface APIEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: { text: string; icon_url?: string; proxy_icon_url?: string };
  image?: { url?: string; proxy_url?: string; height?: number; width?: number };
  thumbnail?: { url?: string; proxy_url?: string; height?: number; width?: number };
  video?: { url?: string; proxy_url?: string; height?: number; width?: number };
  provider?: { name?: string; url?: string };
  author?: { name: string; url?: string; icon_url?: string; proxy_icon_url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface APIMessageReference {
  message_id?: Snowflake;
  channel_id?: Snowflake;
  guild_id?: Snowflake;
  fail_if_not_exists?: boolean;
}

export type APIMessageTopLevelComponent = ActionRowComponent | Record<string, unknown>;

export interface APIInteractionResponseCallbackData {
  tts?: boolean;
  content?: string;
  embeds?: APIEmbed[];
  allowed_mentions?: APIAllowedMentions;
  flags?: MessageFlags;
  components?: APIMessageTopLevelComponent[];
  poll?: Poll;
}

export interface APIModalInteractionResponseCallbackData {
  title: string;
  custom_id: string;
  components: ActionRowComponent[];
}
