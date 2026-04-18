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

export const AuditLogEvent = {
  GuildUpdate: 1,
  ChannelCreate: 10,
  ChannelUpdate: 11,
  ChannelDelete: 12,
  ChannelOverwriteCreate: 13,
  ChannelOverwriteUpdate: 14,
  ChannelOverwriteDelete: 15,
  MemberKick: 20,
  MemberPrune: 21,
  MemberBanAdd: 22,
  MemberBanRemove: 23,
  MemberUpdate: 24,
  MemberRoleUpdate: 25,
  MemberMove: 26,
  MemberDisconnect: 27,
  BotAdd: 28,
  RoleCreate: 30,
  RoleUpdate: 31,
  RoleDelete: 32,
  InviteCreate: 40,
  InviteUpdate: 41,
  InviteDelete: 42,
  WebhookCreate: 50,
  WebhookUpdate: 51,
  WebhookDelete: 52,
  EmojiCreate: 60,
  EmojiUpdate: 61,
  EmojiDelete: 62,
  MessageDelete: 72,
  MessageBulkDelete: 73,
  MessagePin: 74,
  MessageUnpin: 75,
  IntegrationCreate: 80,
  IntegrationUpdate: 81,
  IntegrationDelete: 82,
  StageInstanceCreate: 83,
  StageInstanceUpdate: 84,
  StageInstanceDelete: 85,
  StickerCreate: 90,
  StickerUpdate: 91,
  StickerDelete: 92,
  GuildScheduledEventCreate: 100,
  GuildScheduledEventUpdate: 101,
  GuildScheduledEventDelete: 102,
  ThreadCreate: 110,
  ThreadUpdate: 111,
  ThreadDelete: 112,
  ApplicationCommandPermissionUpdate: 121,
  AutoModerationRuleCreate: 140,
  AutoModerationRuleUpdate: 141,
  AutoModerationRuleDelete: 142,
  AutoModerationBlockMessage: 143,
  AutoModerationFlagToChannel: 144,
  AutoModerationUserCommunicationDisabled: 145,
  CreatorMonetizationRequestCreated: 150,
  CreatorMonetizationTermsAccepted: 151
} as const;

export type AuditLogEvent = typeof AuditLogEvent[keyof typeof AuditLogEvent];

export const AutoModerationEventType = {
  MessageSend: 1
} as const;

export type AutoModerationEventType = typeof AutoModerationEventType[keyof typeof AutoModerationEventType];

export const AutoModerationTriggerType = {
  Keyword: 1,
  Spam: 3,
  KeywordPreset: 4,
  MentionSpam: 5
} as const;

export type AutoModerationTriggerType = typeof AutoModerationTriggerType[keyof typeof AutoModerationTriggerType];

export const AutoModerationActionType = {
  BlockMessage: 1,
  SendAlertMessage: 2,
  Timeout: 3
} as const;

export type AutoModerationActionType = typeof AutoModerationActionType[keyof typeof AutoModerationActionType];
