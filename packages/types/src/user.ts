import type { Snowflake } from "./shared.js";
import type { GuildMember } from "./guild.js";

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
