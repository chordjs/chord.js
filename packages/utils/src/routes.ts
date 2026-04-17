export const Routes = {
  // Application Commands
  applicationCommands: (appId: string) => `/applications/${appId}/commands`,
  applicationCommand: (appId: string, commandId: string) => `/applications/${appId}/commands/${commandId}`,
  guildApplicationCommands: (appId: string, guildId: string) => `/applications/${appId}/guilds/${guildId}/commands`,
  guildApplicationCommand: (appId: string, guildId: string, commandId: string) => `/applications/${appId}/guilds/${guildId}/commands/${commandId}`,

  // Channels
  channel: (channelId: string) => `/channels/${channelId}`,
  channelMessages: (channelId: string) => `/channels/${channelId}/messages`,
  channelMessage: (channelId: string, messageId: string) => `/channels/${channelId}/messages/${messageId}`,
  channelMessageCrosspost: (channelId: string, messageId: string) => `/channels/${channelId}/messages/${messageId}/crosspost`,
  channelMessageReactions: (channelId: string, messageId: string) => `/channels/${channelId}/messages/${messageId}/reactions`,
  channelMessageReactionToken: (channelId: string, messageId: string, emoji: string) => `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
  channelMessageReactionUser: (channelId: string, messageId: string, emoji: string, userId: string) => `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/${userId}`,
  channelBulkDelete: (channelId: string) => `/channels/${channelId}/messages/bulk-delete`,
  channelPermissions: (channelId: string, overwriteId: string) => `/channels/${channelId}/permissions/${overwriteId}`,
  channelInvites: (channelId: string) => `/channels/${channelId}/invites`,
  channelFollowers: (channelId: string) => `/channels/${channelId}/followers`,
  channelTyping: (channelId: string) => `/channels/${channelId}/typing`,
  channelPins: (channelId: string) => `/channels/${channelId}/pins`,
  channelPin: (channelId: string, messageId: string) => `/channels/${channelId}/pins/${messageId}`,

  // Guilds
  guilds: () => '/guilds',
  guild: (guildId: string) => `/guilds/${guildId}`,
  guildPreview: (guildId: string) => `/guilds/${guildId}/preview`,
  guildChannels: (guildId: string) => `/guilds/${guildId}/channels`,
  guildMembers: (guildId: string) => `/guilds/${guildId}/members`,
  guildMember: (guildId: string, userId: string) => `/guilds/${guildId}/members/${userId}`,
  guildMemberRole: (guildId: string, userId: string, roleId: string) => `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
  guildBans: (guildId: string) => `/guilds/${guildId}/bans`,
  guildBan: (guildId: string, userId: string) => `/guilds/${guildId}/bans/${userId}`,
  guildRoles: (guildId: string) => `/guilds/${guildId}/roles`,
  guildRole: (guildId: string, roleId: string) => `/guilds/${guildId}/roles/${roleId}`,
  guildPrune: (guildId: string) => `/guilds/${guildId}/prune`,
  guildVoiceRegions: (guildId: string) => `/guilds/${guildId}/regions`,
  guildInvites: (guildId: string) => `/guilds/${guildId}/invites`,
  guildIntegrations: (guildId: string) => `/guilds/${guildId}/integrations`,
  guildIntegration: (guildId: string, integrationId: string) => `/guilds/${guildId}/integrations/${integrationId}`,
  guildWidget: (guildId: string) => `/guilds/${guildId}/widget`,
  guildWidgetJson: (guildId: string) => `/guilds/${guildId}/widget.json`,
  guildVanityUrl: (guildId: string) => `/guilds/${guildId}/vanity-url`,
  guildWelcomeScreen: (guildId: string) => `/guilds/${guildId}/welcome-screen`,
  guildVoiceState: (guildId: string, userId: string) => `/guilds/${guildId}/voice-states/${userId}`,

  // Users
  user: (userId: string = "@me") => `/users/${userId}`,
  userGuilds: (userId: string = "@me") => `/users/${userId}/guilds`,
  userGuild: (userId: string, guildId: string) => `/users/${userId}/guilds/${guildId}`,
  userChannels: (userId: string = "@me") => `/users/${userId}/channels`,
  userConnections: (userId: string = "@me") => `/users/${userId}/connections`,

  // Webhooks
  webhook: (webhookId: string) => `/webhooks/${webhookId}`,
  webhookToken: (webhookId: string, token: string) => `/webhooks/${webhookId}/${token}`,
  webhookMessage: (webhookId: string, token: string, messageId: string) => `/webhooks/${webhookId}/${token}/messages/${messageId}`,

  // Gateway
  gateway: () => '/gateway',
  gatewayBot: () => '/gateway/bot'
} as const;
