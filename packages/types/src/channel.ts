import type { Snowflake, ChannelType, PermissionOverwrite } from "./shared.js";
import type { User } from "./user.js";

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

export interface StageInstance {
  id: Snowflake;
  guild_id: Snowflake;
  channel_id: Snowflake;
  topic: string;
  privacy_level: number;
  discoverable_disabled: boolean;
  guild_scheduled_event_id: Snowflake | null;
}

export interface GuildScheduledEvent {
  id: Snowflake;
  guild_id: Snowflake;
  channel_id: Snowflake | null;
  creator_id?: Snowflake | null;
  name: string;
  description?: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  privacy_level: number;
  status: number;
  entity_type: number;
  entity_id: Snowflake | null;
  entity_metadata: GuildScheduledEventEntityMetadata | null;
  creator?: User;
  user_count?: number;
  image?: string | null;
}

export interface GuildScheduledEventEntityMetadata {
  location?: string;
}
