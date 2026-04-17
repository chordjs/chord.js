import type { Snowflake } from "./shared.js";
import type { User } from "./user.js";
import type { Channel } from "./channel.js";
import type { ApplicationCommand } from "./interaction.js";

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

export interface Ban {
  reason: string | null;
  user: User;
}

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
