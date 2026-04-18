import { InteractionTypes, type GatewayDispatchDataMap } from "@chordjs/types";
import { type Store, Interaction, CommandInteraction, AutocompleteInteraction, User, Member } from "@chordjs/core";
import {
  InteractionCommand,
  type ApplicationCommandPayload,
  type InteractionDeferOptions,
  type InteractionReplyPayload,
  type InteractionAutocompleteContext
} from "./piece.js";
import {
  Precondition,
  type PreconditionCheck,
  type PreconditionResult,
  runPreconditions,
  type RouterHooks
} from "./hooks/precondition.js";

export interface InteractionDispatchSource {
  onDispatch(event: "INTERACTION_CREATE", handler: (data: GatewayDispatchDataMap["INTERACTION_CREATE"]) => void | Promise<void>): unknown;
  offDispatch?(event: "INTERACTION_CREATE", handler: (data: GatewayDispatchDataMap["INTERACTION_CREATE"]) => void | Promise<void>): unknown;
}

export interface RestLikeClient {
  request<T = unknown>(method: string, path: string, init?: RequestInit): Promise<T>;
}

export interface InteractionCommandRouterOptions {
  client: any; // ChordClient
  rest?: RestLikeClient;
  autoSync?: boolean;
  errorResponse?: {
    enabled?: boolean;
    message?: string | ((error: unknown, context: any) => string);
    ephemeral?: boolean;
  };
  preconditionResolver?: (meta: any, client: any) => PreconditionCheck<any> | null;
  storeName?: string;
  preconditions?: Array<PreconditionCheck<InteractionExecutionContext>>;
  hooks?: RouterHooks<InteractionExecutionContext>;
}

export interface InteractionExecutionContext {
  interaction: GatewayDispatchDataMap["INTERACTION_CREATE"];
  commandName: string;
  options: Record<string, unknown>;
  subcommand?: string;
  subcommandGroup?: string;
  focusedOption?: { name: string; value: unknown };
  command?: InteractionCommand;
}

export class InteractionCommandRouter {
  static readonly EPHEMERAL_FLAG = 1 << 6;
  public readonly client: any;
  public readonly rest?: RestLikeClient;
  public readonly autoSync: boolean;
  public readonly errorResponse: Required<NonNullable<InteractionCommandRouterOptions["errorResponse"]>>;
  public readonly preconditionResolver?: (meta: any, client: any) => PreconditionCheck<any> | null;
  public readonly storeName: string;
  public readonly preconditions: Array<PreconditionCheck<InteractionExecutionContext>>;
  public readonly hooks?: RouterHooks<InteractionExecutionContext>;
  #unbind: (() => void) | null = null;

  constructor(options: InteractionCommandRouterOptions) {
    this.client = options.client;
    this.rest = options.rest;
    this.autoSync = options.autoSync ?? false;
    this.errorResponse = {
      enabled: options.errorResponse?.enabled ?? true,
      message: options.errorResponse?.message ?? "An unexpected error occurred while running this command.",
      ephemeral: options.errorResponse?.ephemeral ?? true
    };
    this.preconditionResolver = options.preconditionResolver;
    this.storeName = options.storeName ?? "commands";
    this.preconditions = options.preconditions ?? [];
    this.hooks = options.hooks;
  }

  get store(): Store<InteractionCommand> {
    return this.client.store(this.storeName) as Store<InteractionCommand>;
  }

  bindGateway(gateway: InteractionDispatchSource): void {
    const handler = async (interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]) => {
      await this.handleInteraction(interaction);
    };

    gateway.onDispatch("INTERACTION_CREATE", handler);
    
    // Auto-Sync logic
    if (this.autoSync) {
      this.client.gateway?.onDispatch("READY", async (data: any) => {
        const rest = this.rest ?? (this.client.rest as any);
        if (!rest) return;
        try {
          await this.registerGlobalCommands(rest, data.application.id, true);
          this.client.container.get("logger")?.info(`Successfully auto-synced ${this.store.size} interaction commands.`);
        } catch (error) {
          this.client.container.get("logger")?.error("Failed to auto-sync interaction commands:", error);
        }
      });
    }

    this.#unbind = () => {
      gateway.offDispatch?.("INTERACTION_CREATE", handler);
    };
  }

  unbindGateway(): void {
    this.#unbind?.();
    this.#unbind = null;
  }

  async registerGlobalCommands(rest: RestLikeClient, applicationId: string, smart = false): Promise<ApplicationCommandPayload[]> {
    const payload = [...this.store.values()]
      .filter((command) => command.enabled)
      .map((command) => command.toApplicationCommand());

    if (smart) {
      try {
        const existing = await rest.request("GET", `/applications/${applicationId}/commands`) as any[];
        const needsSync = existing.length !== payload.length || 
          payload.some(cmd => {
            const ex = existing.find(e => e.name === cmd.name && e.type === (cmd.type ?? 1));
            if (!ex) return true;
            if (ex.description !== (cmd.description ?? "")) return true;
            if (JSON.stringify(ex.options ?? []) !== JSON.stringify(cmd.options ?? [])) return true;
            return false;
          });

        if (!needsSync) return payload;
      } catch (error) {
        // If GET fails, fallback to PUT
      }
    }

    await rest.request("PUT", `/applications/${applicationId}/commands`, {
      body: JSON.stringify(payload)
    });

    return payload;
  }

  async handleInteraction(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]): Promise<boolean> {
    if (
      interaction.type !== InteractionTypes.ApplicationCommand &&
      interaction.type !== InteractionTypes.ApplicationCommandAutocomplete &&
      interaction.type !== InteractionTypes.MessageComponent
    ) {
      return false;
    }

    if (interaction.type === InteractionTypes.MessageComponent) {
      const customId = (interaction.data as any).custom_id;
      if (!customId) return false;

      // Try to find a handler in loaded commands
      for (const command of this.store.values()) {
        const handlers = (command as any).getComponentHandlers?.() ?? [];
        for (const handler of handlers) {
          const matches = typeof handler.customId === "string" 
            ? handler.customId === customId 
            : handler.customId.test(customId);
          
          if (matches && typeof (command as any)[handler.propertyKey] === "function") {
             // We found a match! Execute it.
             // (Implementation details for context creation skipped for brevity here, similar to runPreconditions)
             return this.#executeComponentHandler(interaction, command, handler.propertyKey);
          }
        }
      }
      return false;
    }

    const commandName = this.#interactionCommandName(interaction);
    if (!commandName) return false;

    const command = this.resolveCommand(commandName);
    if (!command || !command.enabled) return false;

    const parsedOptions = this.#interactionOptions(interaction);
    const standardized = this.#standardizeInteractionContext(interaction);

    const interactionWrapper = Interaction.from(this.client, interaction as any);

    if (interactionWrapper.isAutocomplete()) {
      if (typeof command.autocomplete === "function") {
        const autocompleteContext: InteractionAutocompleteContext = {
          interaction: interactionWrapper,
          commandName,
          options: parsedOptions.values,
          subcommand: parsedOptions.subcommand,
          subcommandGroup: parsedOptions.subcommandGroup,
          focusedOption: parsedOptions.focusedOption as { name: string; value: string | number } | undefined,
          guildId: standardized.guildId,
          channelId: standardized.channelId,
          user: standardized.user,
          member: standardized.member,
          respond: async (choices) => {
            return interactionWrapper.respond(choices);
          }
        };

        try {
          await command.autocomplete(autocompleteContext);
          return true;
        } catch (error) {
          await this.hooks?.onError?.({ ...autocompleteContext, command } as any, error);
          return false;
        }
      }
      return false;
    }

    const context: InteractionExecutionContext = {
      interaction,
      commandName,
      options: parsedOptions.values,
      subcommand: parsedOptions.subcommand,
      subcommandGroup: parsedOptions.subcommandGroup,
      focusedOption: parsedOptions.focusedOption,
      command
    };

    const guard = await this.runPreconditions(context);
    if (!guard.ok) return false;

    try {
      await this.hooks?.beforeRun?.(context);
      
      const cmdInteraction = interactionWrapper as CommandInteraction;
      
      let runMethod: any;
      if (cmdInteraction.commandType === 1) { // CHAT_INPUT
        // Check for subcommands first
        if (context.subcommand && typeof (command as any).getPreconditions === "function") {
          const subcommands = (command as any).getSubcommands?.() ?? [];
          const found = subcommands.find((s: any) => s.name === context.subcommand);
          if (found && typeof (command as any)[found.propertyKey] === "function") {
            runMethod = (command as any)[found.propertyKey];
          }
        }
        if (!runMethod) {
          runMethod = typeof (command as any).chatInputRun === "function" ? (command as any).chatInputRun : command.run;
        }
      } else if (cmdInteraction.commandType === 2) { // USER
        runMethod = typeof (command as any).userContextRun === "function" ? (command as any).userContextRun : command.run;
      } else if (cmdInteraction.commandType === 3) { // MESSAGE
        runMethod = typeof (command as any).messageContextRun === "function" ? (command as any).messageContextRun : command.run;
      } else {
        runMethod = command.run;
      }

      const runContext: any = {
        interaction: cmdInteraction,
        commandName: context.commandName,
        options: context.options,
        subcommand: context.subcommand,
        subcommandGroup: context.subcommandGroup,
        focusedOption: context.focusedOption,
        guildId: standardized.guildId,
        channelId: standardized.channelId,
        user: standardized.user as User,
        member: standardized.member as Member,
        resolved: standardized.resolved,
        reply: async (payload: any) => {
          return interactionWrapper.reply(payload);
        },
        deferReply: async (options: any) => {
          return interactionWrapper.deferReply(options);
        },
        editReply: async (payload: any) => {
          return interactionWrapper.editReply(payload);
        },
        followUp: async (payload: any) => {
          return interactionWrapper.followUp(payload);
        }
      };

      await runMethod.call(command, runContext);
      await this.hooks?.afterRun?.(context);
      return true;
    } catch (error) {
      await this.hooks?.onError?.(context, error);
      if (!this.errorResponse.enabled || !this.rest) throw error;
      await this.#sendDefaultErrorResponse(interaction, context, error);
      return false;
    }
  }

  async runPreconditions(context: InteractionExecutionContext): Promise<PreconditionResult> {
    const methodMap: Record<number, string> = { 1: "chatInputRun", 2: "userContextRun", 3: "messageContextRun" };
    const methodName = methodMap[(context.command as any).type ?? 1];
    
    const commandPreconditions = context.command?.getPreconditions?.(methodName) ?? [];
    const resolved = this.preconditionResolver 
      ? commandPreconditions.map(p => this.preconditionResolver!(p, this.client)).filter(p => p !== null) as Array<PreconditionCheck<any>>
      : [];

    const all = [...this.preconditions, ...resolved];
    if (all.length === 0) return Precondition.pass();
    return runPreconditions(all, context);
  }

  resolveCommand(name: string): InteractionCommand | null {
    const lookup = name.toLowerCase();
    for (const command of this.store.values()) {
      if (command.name.toLowerCase() === lookup) return command;
    }
    return null;
  }

  #interactionCommandName(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]): string | null {
    const raw = interaction as unknown as { data?: { name?: unknown } };
    return typeof raw.data?.name === "string" ? raw.data.name : null;
  }

  #interactionOptions(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]): {
    values: Record<string, unknown>;
    subcommand?: string;
    subcommandGroup?: string;
    focusedOption?: { name: string; value: unknown };
  } {
    type RawOption = {
      type?: unknown;
      name?: unknown;
      value?: unknown;
      focused?: unknown;
      options?: unknown;
    };
    const raw = interaction as unknown as { data?: { options?: unknown } };
    const options = raw.data?.options;
    if (!Array.isArray(options)) return { values: {} };

    const out: Record<string, unknown> = {};
    let subcommand: string | undefined;
    let subcommandGroup: string | undefined;
    let focusedOption: { name: string; value: unknown } | undefined;

    const visit = (items: RawOption[], depth: number): void => {
      for (const item of items) {
        if (typeof item?.name !== "string") continue;
        const optionType = typeof item.type === "number" ? item.type : null;

        if (optionType === 2) {
          if (depth === 0) subcommandGroup = item.name;
          if (Array.isArray(item.options)) visit(item.options as RawOption[], depth + 1);
          continue;
        }
        if (optionType === 1) {
          if (!subcommand) subcommand = item.name;
          if (Array.isArray(item.options)) visit(item.options as RawOption[], depth + 1);
          continue;
        }

        out[item.name] = item.value;
        if (item.focused === true) {
          focusedOption = { name: item.name, value: item.value };
        }
      }
    };

    visit(options as RawOption[], 0);
    return { values: out, subcommand, subcommandGroup, focusedOption };
  }

  #standardizeInteractionContext(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]): {
    guildId?: string;
    channelId?: string;
    user?: User;
    member?: Member;
    resolved?: Record<string, unknown>;
  } {
    const raw = interaction as unknown as {
      guild_id?: string;
      channel_id?: string;
      user?: any;
      member?: any;
      data?: { resolved?: any };
    };

    const guildId = raw.guild_id;
    const member = raw.member ? new Member(this.client, guildId!, raw.member) : undefined;
    const user = raw.user ? new User(this.client, raw.user) : (member ? member.user : undefined);

    return {
      guildId,
      channelId: raw.channel_id,
      user,
      member,
      resolved: raw.data?.resolved
    };
  }

  #mustRest(): RestLikeClient {
    if (!this.rest) {
      throw new Error("InteractionCommandRouter: rest client is not configured");
    }
    return this.rest;
  }

  #interactionMeta(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]): {
    id: string;
    token: string;
    applicationId: string;
  } {
    const raw = interaction as unknown as { id?: unknown; token?: unknown; application_id?: unknown };
    if (typeof raw.id !== "string" || typeof raw.token !== "string" || typeof raw.application_id !== "string") {
      throw new Error("InteractionCommandRouter: interaction metadata is missing (id/token/application_id)");
    }
    return { id: raw.id, token: raw.token, applicationId: raw.application_id };
  }

  async #reply(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], payload: InteractionReplyPayload): Promise<unknown> {
    const rest = this.#mustRest();
    const { id, token } = this.#interactionMeta(interaction);
    return rest.request("POST", `/interactions/${id}/${token}/callback`, {
      body: JSON.stringify({
        type: 4,
        data: this.#normalizeFlags(payload)
      })
    });
  }

  async #deferReply(
    interaction: GatewayDispatchDataMap["INTERACTION_CREATE"],
    options: InteractionDeferOptions = {}
  ): Promise<unknown> {
    const rest = this.#mustRest();
    const { id, token } = this.#interactionMeta(interaction);
    return rest.request("POST", `/interactions/${id}/${token}/callback`, {
      body: JSON.stringify({
        type: 5,
        data: this.#normalizeFlags(options)
      })
    });
  }

  async #editReply(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], payload: InteractionReplyPayload): Promise<unknown> {
    const rest = this.#mustRest();
    const { applicationId, token } = this.#interactionMeta(interaction);
    return rest.request("PATCH", `/webhooks/${applicationId}/${token}/messages/@original`, {
      body: JSON.stringify(this.#normalizeFlags(payload))
    });
  }

  async #followUp(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], payload: InteractionReplyPayload): Promise<unknown> {
    const rest = this.#mustRest();
    const { applicationId, token } = this.#interactionMeta(interaction);
    return rest.request("POST", `/webhooks/${applicationId}/${token}`, {
      body: JSON.stringify(this.#normalizeFlags(payload))
    });
  }

  #normalizeFlags<T extends { flags?: number; ephemeral?: boolean }>(payload: T): Omit<T, "ephemeral"> {
    const ephemeral = payload.ephemeral === true;
    const currentFlags = typeof payload.flags === "number" ? payload.flags : 0;
    const mergedFlags = ephemeral ? currentFlags | InteractionCommandRouter.EPHEMERAL_FLAG : currentFlags;

    const { ephemeral: _ephemeral, ...rest } = payload;
    return {
      ...rest,
      ...(mergedFlags !== 0 ? { flags: mergedFlags } : null)
    };
  }

  async #sendDefaultErrorResponse(
    interaction: GatewayDispatchDataMap["INTERACTION_CREATE"],
    context: InteractionExecutionContext,
    error: unknown
  ): Promise<void> {
    const message =
      typeof this.errorResponse.message === "function"
        ? this.errorResponse.message(error, context)
        : this.errorResponse.message;
    const payload: InteractionReplyPayload = {
      content: message,
      ephemeral: this.errorResponse.ephemeral
    };

    try {
      await this.#reply(interaction, payload);
      return;
    } catch {
      await this.#followUp(interaction, payload);
    }
  }

  async #executeComponentHandler(interaction: any, command: any, propertyKey: string | symbol): Promise<boolean> {
    const standardized = this.#standardizeInteractionContext(interaction);
    const data = interaction.data as any;

    const context: any = {
      interaction,
      customId: data.custom_id,
      componentType: data.component_type,
      values: data.values,
      guildId: standardized.guildId,
      channelId: standardized.channelId,
      user: standardized.user,
      member: standardized.member,
      reply: async (payload: any) => this.#reply(interaction, payload),
      deferReply: async (options: any) => this.#deferReply(interaction, options),
      editReply: async (payload: any) => this.#editReply(interaction, payload),
      followUp: async (payload: any) => this.#followUp(interaction, payload),
      updateMessage: async (payload: any) => {
        const rest = this.#mustRest();
        const { id, token } = this.#interactionMeta(interaction);
        return rest.request("POST", `/interactions/${id}/${token}/callback`, {
          body: JSON.stringify({ type: 7, data: this.#normalizeFlags(payload) })
        });
      }
    };

    try {
      await command[propertyKey](context);
      return true;
    } catch (error) {
      await this.hooks?.onError?.({ interaction, command, commandName: "component" } as any, error);
      return false;
    }
  }
}
