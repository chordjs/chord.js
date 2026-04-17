import type { Snowflake, InteractionType, ComponentType, MessageFlags, APIAllowedMentions } from "./shared.js";
import type { User } from "./user.js";
import type { GuildMember, Emoji } from "./guild.js";
import type { Message, APIEmbed, Poll } from "./message.js";

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
