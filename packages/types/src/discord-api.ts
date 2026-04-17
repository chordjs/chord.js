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
}

export interface MessageReaction {
  count: number;
  me: boolean;
  emoji: Emoji;
}

// --- Interaction ---

export type InteractionType = number;

export const InteractionTypes = {
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
