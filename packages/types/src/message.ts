import type { Snowflake, MessageFlags } from "./shared.js";
import type { User } from "./user.js";
import type { GuildMember, Emoji } from "./guild.js";
import type { APIMessageTopLevelComponent } from "./interaction.js";

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

export interface Sticker {
  id: Snowflake;
  pack_id?: Snowflake;
  name: string;
  description: string | null;
  tags: string;
  type: number;
  format_type: number;
  available?: boolean;
  guild_id?: Snowflake;
  user?: User;
  sort_value?: number;
}

export interface StickerPack {
  id: Snowflake;
  stickers: Sticker[];
  name: string;
  sku_id: Snowflake;
  cover_sticker_id?: Snowflake;
  description: string;
  banner_asset_id?: Snowflake;
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
