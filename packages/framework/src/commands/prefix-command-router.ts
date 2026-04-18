import { Command } from "../pieces/command.js";
import { resolvePrecondition } from "../pieces/decorators.js";
import type {
  APIAllowedMentions,
  APIEmbed,
  APIMessageReference,
  APIMessageTopLevelComponent,
  GuildMember,
  MessageCreateDispatchData,
  MessageFlags,
  Snowflake
} from "@chordjs/types";
import type { ChordClient } from "../structures/chord-client.js";
import type { Store } from "@chordjs/core";
import {
  Precondition,
  type PreconditionCheck,
  type PreconditionResult,
  runPreconditions,
  type RouterHooks
} from "@chordjs/interactions";
import { Args } from "./args.js";

export interface PrefixReplyPayload {
  content?: string;
  tts?: boolean;
  embeds?: APIEmbed[];
  components?: APIMessageTopLevelComponent[];
  allowed_mentions?: APIAllowedMentions;
  message_reference?: APIMessageReference;
  flags?: MessageFlags;
}

export interface PrefixCommandContext {
  commandName: string;
  args: Args;
  rawArgs: string[];
  raw: string;
  message: PrefixMessageLike;
  command?: Command;
  reply(payload: string | PrefixReplyPayload): Promise<unknown>;
}

export interface PrefixMessageLike {
  content: string;
  channel_id?: Snowflake;
  channelId?: Snowflake;
  guild_id?: Snowflake;
  guildId?: Snowflake;
  author?: MessageCreateDispatchData["author"];
  member?: any;
}

export interface PrefixCommandRouterOptions {
  client: ChordClient;
  prefix: string | ((message: PrefixMessageLike) => string | null | undefined);
  mentionPrefixIds?: Snowflake[];
  dynamicPrefixCache?: {
    enabled?: boolean;
    maxSize?: number;
    key?: (message: PrefixMessageLike) => string | null | undefined;
  };
  storeName?: string;
  caseInsensitive?: boolean;
  reply?: (
    message: PrefixMessageLike,
    payload: string | PrefixReplyPayload,
    context: PrefixCommandContext
  ) => Promise<unknown>;
  errorResponse?: {
    enabled?: boolean;
    message?: string | ((error: unknown, context: PrefixCommandContext) => string | PrefixReplyPayload);
  };
  preconditions?: Array<PreconditionCheck<PrefixCommandContext>>;
  hooks?: RouterHooks<PrefixCommandContext>;
  preconditionResolver?: (meta: any, client: any) => PreconditionCheck<any> | null;
}

export class PrefixCommandRouter {
  public readonly client: ChordClient;
  public readonly prefix: PrefixCommandRouterOptions["prefix"];
  public readonly mentionPrefixIds: Snowflake[];
  public readonly storeName: string;
  public readonly caseInsensitive: boolean;
  public readonly reply?: PrefixCommandRouterOptions["reply"];
  public readonly errorResponse: Required<NonNullable<PrefixCommandRouterOptions["errorResponse"]>>;
  public readonly preconditions: Array<PreconditionCheck<PrefixCommandContext>>;
  public readonly hooks?: RouterHooks<PrefixCommandContext>;
  public readonly preconditionResolver?: (meta: any, client: any) => PreconditionCheck<any> | null;
  readonly #dynamicPrefixCacheEnabled: boolean;
  readonly #dynamicPrefixCacheMaxSize: number;
  readonly #dynamicPrefixCacheKey?: (message: PrefixMessageLike) => string | null | undefined;
  readonly #cachedDynamicPrefixes = new Map<string, string | null | undefined>();

  constructor(options: PrefixCommandRouterOptions) {
    this.client = options.client;
    this.prefix = options.prefix;
    this.mentionPrefixIds = options.mentionPrefixIds ?? [];
    this.storeName = options.storeName ?? "commands";
    this.caseInsensitive = options.caseInsensitive ?? true;
    this.reply = options.reply;
    this.errorResponse = {
      enabled: options.errorResponse?.enabled ?? true,
      message: options.errorResponse?.message ?? "An unexpected error occurred while running this command."
    };
    this.preconditions = options.preconditions ?? [];
    this.hooks = options.hooks;
    this.preconditionResolver = options.preconditionResolver;
    this.#dynamicPrefixCacheEnabled = options.dynamicPrefixCache?.enabled ?? true;
    this.#dynamicPrefixCacheMaxSize = options.dynamicPrefixCache?.maxSize ?? 500;
    this.#dynamicPrefixCacheKey = options.dynamicPrefixCache?.key;
  }

  get store(): Store<Command> {
    return this.client.store<Command>(this.storeName);
  }

  async handleMessage(message: PrefixMessageLike): Promise<boolean> {
    const parsed = this.parse(message);
    if (!parsed) return false;

    const command = this.resolveCommand(parsed.commandName);
    if (!command || !command.enabled) return false;
    parsed.command = command;

    const guard = await this.runPreconditions(parsed);
    if (!guard.ok) return false;

    try {
      await this.hooks?.beforeRun?.(parsed);
      if (typeof command.messageRun === "function") {
        await command.messageRun(parsed);
      } else if (typeof command.run === "function") {
        await command.run(parsed);
      } else {
        throw new Error(`Command ${command.name} has no messageRun or run method`);
      }
      await this.hooks?.afterRun?.(parsed);
      return true;
    } catch (error) {
      await this.hooks?.onError?.(parsed, error);
      if (this.errorResponse.enabled && this.reply) {
        try {
          const payload = typeof this.errorResponse.message === "function"
            ? this.errorResponse.message(error, parsed)
            : this.errorResponse.message;
          await parsed.reply(payload);
        } catch (replyError) {
          // ignore double fault
        }
      }
      throw error;
    }
  }

  async runPreconditions(context: PrefixCommandContext): Promise<PreconditionResult> {
    const commandPreconditions = context.command?.getEffectivePreconditions("messageRun") ?? [];
    const resolved = this.preconditionResolver
      ? commandPreconditions
          .map(p => this.preconditionResolver!(p, this.client))
          .filter((p): p is PreconditionCheck<any> => p !== null)
      : [];

    const all = [...this.preconditions, ...resolved];
    if (all.length === 0) return Precondition.pass();
    return runPreconditions(all, context);
  }

  parse(message: PrefixMessageLike): PrefixCommandContext | null {
    const prefix = this.#resolvePrefix(message);
    if (!prefix) return null;
    if (!message.content.startsWith(prefix)) return null;

    const withoutPrefix = message.content.slice(prefix.length).trim();
    if (!withoutPrefix) return null;

    const [rawName, ...args] = this.tokenize(withoutPrefix);
    if (!rawName) return null;
    const commandName = this.caseInsensitive ? rawName.toLowerCase() : rawName;

    const context: PrefixCommandContext = {
      commandName,
      args: new Args(this.client, args, message),
      rawArgs: args,
      raw: withoutPrefix,
      message,
      reply: async (payload: string | PrefixReplyPayload) => {
        if (!this.reply) {
          throw new Error("PrefixCommandRouter: reply handler is not configured");
        }
        return this.reply(message, payload, context);
      }
    };
    return context;
  }

  #resolvePrefix(message: PrefixMessageLike): string | null | undefined {
    const mentionPrefix = this.#resolveMentionPrefix(message.content);
    if (mentionPrefix) return mentionPrefix;
    if (typeof this.prefix !== "function") return this.prefix;
    if (!this.#dynamicPrefixCacheEnabled) return this.prefix(message);

    const cacheKey = this.#dynamicPrefixCacheKey?.(message) ?? message.guild_id ?? message.guildId ?? null;
    if (!cacheKey) return this.prefix(message);
    if (this.#cachedDynamicPrefixes.has(cacheKey)) return this.#cachedDynamicPrefixes.get(cacheKey);

    const resolved = this.prefix(message);
    if (this.#cachedDynamicPrefixes.size >= this.#dynamicPrefixCacheMaxSize) {
      const oldest = this.#cachedDynamicPrefixes.keys().next().value;
      if (oldest) this.#cachedDynamicPrefixes.delete(oldest);
    }
    this.#cachedDynamicPrefixes.set(cacheKey, resolved);
    return resolved;
  }

  #resolveMentionPrefix(content: string): string | null {
    for (const id of this.mentionPrefixIds) {
      const base = `<@${id}>`;
      if (content.startsWith(base)) return base;
      const nick = `<@!${id}>`;
      if (content.startsWith(nick)) return nick;
    }
    return null;
  }

  resolveCommand(name: string): Command | null {
    const lookup = this.caseInsensitive ? name.toLowerCase() : name;
    for (const command of this.store.values()) {
      const commandName = this.caseInsensitive ? command.name.toLowerCase() : command.name;
      if (commandName === lookup) return command;
      for (const alias of command.aliases) {
        const aliasName = this.caseInsensitive ? alias.toLowerCase() : alias;
        if (aliasName === lookup) return command;
      }
    }
    return null;
  }

  tokenize(input: string): string[] {
    // Minimal tokenizer with quote support: ping "hello world" test
    const tokens: string[] = [];
    let current = "";
    let quote: '"' | "'" | null = null;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i]!;
      if (quote) {
        if (ch === quote) {
          quote = null;
          continue;
        }
        current += ch;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }

      if (/\s/.test(ch)) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
        continue;
      }

      current += ch;
    }

    if (current.length > 0) tokens.push(current);
    return tokens;
  }
}

