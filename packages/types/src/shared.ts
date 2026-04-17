export type Snowflake = string;

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

export type InteractionType = number;

export const InteractionTypes = {
  Ping: 1,
  ApplicationCommand: 2,
  MessageComponent: 3,
  ApplicationCommandAutocomplete: 4,
  ModalSubmit: 5
} as const;

export type ComponentType = number;

export const ComponentTypes = {
  ActionRow: 1,
  Button: 2,
  StringSelect: 3,
  TextInput: 4,
  UserSelect: 5,
  RoleSelect: 6,
  MentionableSelect: 7,
  ChannelSelect: 8
} as const;

export const ButtonStyles = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5
} as const;

export const ApplicationCommandTypes = {
  ChatInput: 1,
  User: 2,
  Message: 3
} as const;

export const ApplicationCommandOptionTypes = {
  Subcommand: 1,
  SubcommandGroup: 2,
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

export type ButtonStyle = typeof ButtonStyles[keyof typeof ButtonStyles];
export type ApplicationCommandType = typeof ApplicationCommandTypes[keyof typeof ApplicationCommandTypes];
export type ApplicationCommandOptionType = typeof ApplicationCommandOptionTypes[keyof typeof ApplicationCommandOptionTypes];

export type MessageFlags = number;

export interface PermissionOverwrite {
  id: Snowflake;
  type: number; // 0 = role, 1 = member
  allow: string;
  deny: string;
}

export interface APIAllowedMentions {
  parse?: Array<"roles" | "users" | "everyone">;
  roles?: Snowflake[];
  users?: Snowflake[];
  replied_user?: boolean;
}
