export * from "./structures/chord-client.js";
export * from "./structures/plugin.js";

export * from "./loaders/piece-loader.js";
export * from "./bindings/listener-binder.js";
export * from "./commands/prefix-command-router.js";
export * from "./commands/args.js";

export * from "./pieces/command.js";
export * from "./pieces/listener.js";
export * from "./pieces/service.js";
export * from "./pieces/decorators.js";

// Re-export ecosystem packages
export * from "@chordjs/interactions";
export * from "@chordjs/metrics";
export * from "@chordjs/logger";
export * from "@chordjs/i18n";

// Re-export core entities and managers, excluding conflicting names
export {
  BaseEntity,
  User,
  Guild,
  Channel,
  Member,
  Message,
  SKU,
  Entitlement,
  Application,
  AuditLog,
  AutoModerationRule,
  Ban,
  Invite,
  ScheduledEvent,
  StageInstance,
  Sticker,
  Webhook,
  GuildTemplate,
  Interaction,
  CommandInteraction,
  AutocompleteInteraction,
  Store,
  Container,
  UserManager,
  GuildManager,
  ChannelManager,
  ApplicationCommandManager,
  awaitMessages,
  awaitComponents,
  awaitReactions,
  GatewayIntentBits,
  type Snowflake
} from "@chordjs/core";
