import { InteractionType, type GatewayDispatchDataMap } from "@chordjs/types";
import type { Store } from "../structures/store.js";
import type { ChordClient } from "../structures/chord-client.js";
import type { Modal, ModalContext } from "../pieces/modal.js";
import {
  Precondition,
  type PreconditionCheck,
  type PreconditionResult,
  runPreconditions,
  type RouterHooks
} from "../hooks/precondition.js";

export interface ModalDispatchSource {
  onDispatch(event: "INTERACTION_CREATE", handler: (data: GatewayDispatchDataMap["INTERACTION_CREATE"]) => void | Promise<void>): unknown;
  offDispatch?(event: "INTERACTION_CREATE", handler: (data: GatewayDispatchDataMap["INTERACTION_CREATE"]) => void | Promise<void>): unknown;
}

interface RestLikeClient {
  request<T = unknown>(method: string, path: string, init?: RequestInit): Promise<T>;
}

export interface ModalRouterOptions {
  client: ChordClient;
  rest?: RestLikeClient;
  errorResponse?: {
    enabled?: boolean;
    message?: string | ((error: unknown, context: ModalContext) => string);
    ephemeral?: boolean;
  };
  storeName?: string;
  preconditions?: Array<PreconditionCheck<ModalContext>>;
  hooks?: RouterHooks<ModalContext>;
}

export class ModalRouter {
  static readonly EPHEMERAL_FLAG = 1 << 6;
  public readonly client: ChordClient;
  public readonly rest?: RestLikeClient;
  public readonly errorResponse: Required<NonNullable<ModalRouterOptions["errorResponse"]>>;
  public readonly storeName: string;
  public readonly preconditions: Array<PreconditionCheck<ModalContext>>;
  public readonly hooks?: RouterHooks<ModalContext>;
  #unbind: (() => void) | null = null;

  constructor(options: ModalRouterOptions) {
    this.client = options.client;
    this.rest = options.rest;
    this.errorResponse = {
      enabled: options.errorResponse?.enabled ?? true,
      message: options.errorResponse?.message ?? "An unexpected error occurred while processing this modal.",
      ephemeral: options.errorResponse?.ephemeral ?? true
    };
    this.storeName = options.storeName ?? "modals";
    this.preconditions = options.preconditions ?? [];
    this.hooks = options.hooks;
  }

  get store(): Store<Modal> {
    return this.client.store<Modal>(this.storeName);
  }

  bindGateway(gateway: ModalDispatchSource): void {
    const handler = async (interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]) => {
      await this.handleInteraction(interaction);
    };

    gateway.onDispatch("INTERACTION_CREATE", handler);
    this.#unbind = () => {
      gateway.offDispatch?.("INTERACTION_CREATE", handler);
    };
  }

  unbindGateway(): void {
    this.#unbind?.();
    this.#unbind = null;
  }

  async handleInteraction(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]): Promise<boolean> {
    if (interaction.type !== InteractionType.ModalSubmit) return false;

    const data = interaction.data as any;
    if (!data || !data.custom_id) return false;
    
    const customId = data.custom_id as string;
    const modal = this.resolveModal(customId);
    if (!modal || !modal.enabled) return false;

    const fields = new Map<string, string>();
    if (Array.isArray(data.components)) {
      for (const row of data.components) {
        if (row.type === 1 && Array.isArray(row.components)) {
          for (const component of row.components) {
            if (component.type === 4) { // TextInput
              fields.set(component.custom_id, component.value);
            }
          }
        }
      }
    }

    const standardized = this.#standardizeInteractionContext(interaction);

    const context: ModalContext = {
      interaction,
      customId,
      fields,
      guildId: standardized.guildId,
      channelId: standardized.channelId,
      user: standardized.user,
      member: standardized.member,
      reply: async (payload) => this.#reply(interaction, payload),
      deferReply: async (options) => this.#deferReply(interaction, options),
      editReply: async (payload) => this.#editReply(interaction, payload),
      followUp: async (payload) => this.#followUp(interaction, payload),
    };

    const guard = await this.runPreconditions(context);
    if (!guard.ok) return false;

    try {
      await this.hooks?.beforeRun?.(context);
      await modal.run(context);
      await this.hooks?.afterRun?.(context);
      return true;
    } catch (error) {
      await this.hooks?.onError?.(context, error);
      if (!this.errorResponse.enabled || !this.rest) throw error;
      await this.#sendDefaultErrorResponse(interaction, context, error);
      return false;
    }
  }

  resolveModal(customId: string): Modal | null {
    for (const modal of this.store.values()) {
      if (modal.isMatch(customId)) return modal;
    }
    return null;
  }

  async runPreconditions(context: ModalContext): Promise<PreconditionResult> {
    if (this.preconditions.length === 0) return Precondition.pass();
    return runPreconditions(this.preconditions, context);
  }

  #standardizeInteractionContext(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]) {
    const raw = interaction as any;
    const guildId = raw.guild_id ?? raw.guildId;
    const channelId = raw.channel_id ?? raw.channelId;
    const user = raw.user ?? raw.member?.user;
    const member = raw.member;
    return { guildId, channelId, user, member };
  }

  async #reply(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], payload: any): Promise<unknown> {
    if (!this.rest) throw new Error("ModalRouter: REST client is not configured");
    let flags = payload.flags ?? 0;
    if (payload.ephemeral) flags |= ModalRouter.EPHEMERAL_FLAG;

    return this.rest.request("POST", `/interactions/${interaction.id}/${interaction.token}/callback`, {
      body: JSON.stringify({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: payload.content,
          embeds: payload.embeds,
          components: payload.components,
          allowed_mentions: payload.allowed_mentions,
          flags: flags === 0 ? undefined : flags
        }
      })
    });
  }

  async #deferReply(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], options?: any): Promise<unknown> {
    if (!this.rest) throw new Error("ModalRouter: REST client is not configured");
    let flags = options?.flags ?? 0;
    if (options?.ephemeral) flags |= ModalRouter.EPHEMERAL_FLAG;

    return this.rest.request("POST", `/interactions/${interaction.id}/${interaction.token}/callback`, {
      body: JSON.stringify({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: flags === 0 ? undefined : { flags }
      })
    });
  }

  async #editReply(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], payload: any): Promise<unknown> {
    if (!this.rest) throw new Error("ModalRouter: REST client is not configured");
    return this.rest.request("PATCH", `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
      body: JSON.stringify(payload)
    });
  }

  async #followUp(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], payload: any): Promise<unknown> {
    if (!this.rest) throw new Error("ModalRouter: REST client is not configured");
    let flags = payload.flags ?? 0;
    if (payload.ephemeral) flags |= ModalRouter.EPHEMERAL_FLAG;
    const body = { ...payload, flags: flags === 0 ? undefined : flags };

    return this.rest.request("POST", `/webhooks/${interaction.application_id}/${interaction.token}`, {
      body: JSON.stringify(body)
    });
  }

  async #sendDefaultErrorResponse(interaction: GatewayDispatchDataMap["INTERACTION_CREATE"], context: ModalContext, error: unknown): Promise<void> {
    if (!this.rest) return;
    const msg = typeof this.errorResponse.message === "function"
      ? this.errorResponse.message(error, context)
      : this.errorResponse.message;

    let flags = 0;
    if (this.errorResponse.ephemeral) flags |= ModalRouter.EPHEMERAL_FLAG;

    try {
      await this.rest.request("POST", `/interactions/${interaction.id}/${interaction.token}/callback`, {
        body: JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: { content: msg, flags }
        })
      });
    } catch {
      // maybe already replied -> fallback to edit
      try {
        await this.#editReply(interaction, { content: msg, components: [] });
      } catch {
        // ignore
      }
    }
  }
}
