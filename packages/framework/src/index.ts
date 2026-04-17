// Re-export core framework classes and utilities
export * from '@chordjs/core';

// Re-export Rest components
export * from '@chordjs/rest';

// Re-export Gateway components
export * from '@chordjs/gateway';

// Re-export Voice components
export * from '@chordjs/voice';

// Re-export Builders
export * from '@chordjs/builders';

// Re-export Cache & Collection components as namespace to avoid GatewayEventEmitter conflict
export * as Cache from '@chordjs/cache';
export * from '@chordjs/collection';

// Re-export Typings as namespace to avoid structure class conflicts
export * as Types from '@chordjs/types';

// Re-export Utilities directly
export * from '@chordjs/utils';

// Re-export common types and constants directly for convenience
export { 
  GatewayIntentBits, 
  GatewayOpcode,
  ButtonStyle,
  ComponentType,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ChannelTypes,
  InteractionTypes
} from '@chordjs/types';
