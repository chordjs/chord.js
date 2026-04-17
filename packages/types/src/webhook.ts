import type { Snowflake } from "./shared.js";
import type { User } from "./user.js";
import type { Guild } from "./guild.js";
import type { Channel } from "./channel.js";

export interface Webhook {
  id: Snowflake;
  type: number;
  guild_id?: Snowflake | null;
  channel_id: Snowflake | null;
  user?: User;
  name: string | null;
  avatar: string | null;
  token?: string;
  application_id: Snowflake | null;
  source_guild?: Partial<Guild>;
  source_channel?: Partial<Channel>;
  url?: string;
}
