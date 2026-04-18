import { ChordClient as BaseChordClient, type ChordClientOptions as BaseChordClientOptions, Message } from "@chordjs/core";
import { Container } from "@chordjs/core";
import { PieceLoader } from "../loaders/piece-loader.js";
import { PrefixCommandRouter, type PrefixMessageLike } from "../commands/prefix-command-router.js";
import { InteractionCommandRouter } from "@chordjs/interactions";
import { MetricsManager } from "@chordjs/metrics";
import { createLogger, type Logger } from "@chordjs/logger";
import { I18nManager } from "@chordjs/i18n";
import { resolvePrecondition } from "../pieces/decorators.js";

/**
 * Extended ChordClient for the framework.
 */
export interface ChordClientOptions extends BaseChordClientOptions {
  container?: Container;
  prefix?: string | ((message: PrefixMessageLike) => string | null | undefined);
  ownerIds?: string[];
  autoSyncCommands?: boolean;
}

export class ChordClient extends BaseChordClient {
  public readonly container: Container;
  public readonly loader: PieceLoader;
  public readonly metrics: MetricsManager;
  public readonly logger: Logger;
  public readonly i18n: I18nManager;
  public readonly ownerIds: string[];

  constructor(options: ChordClientOptions = {}) {
    super(options);
    this.ownerIds = options.ownerIds ?? [];
    this.container = options.container ?? new Container();
    this.loader = new PieceLoader({ client: this as any });
    this.metrics = new MetricsManager(this as any);
    this.logger = createLogger({ scope: "chord" });
    this.i18n = new I18nManager();
    this.container.register(Container.createToken<Logger>("logger"), this.logger);
    this.container.register(Container.createToken<I18nManager>("i18n"), this.i18n);

    // Metrics wiring
    if (this.gateway) {
      this.gateway.onDispatch("*", () => {
        this.metrics._recordGatewayEvent();
      });
    }

    // Setup InteractionCommandRouter
    const interactionRouter = new InteractionCommandRouter({
      client: this as any,
      autoSync: options.autoSyncCommands ?? true,
      preconditionResolver: (meta, client) => resolvePrecondition(meta, client)
    });
    this.container.register(Container.createToken<InteractionCommandRouter>("InteractionCommandRouter"), interactionRouter);

    if (this.gateway) {
      this.gateway.onDispatch("INTERACTION_CREATE", async (data: any) => {
        await interactionRouter.handleInteraction(data);
      });
    }

    // Auto setup PrefixCommandRouter if prefix is provided
    if (options.prefix) {
      const router = new PrefixCommandRouter({
        client: this as any,
        prefix: options.prefix,
        reply: async (messagePayload, payload) => {
          const message = new Message(this as any, messagePayload as any);
          return message.reply(payload as any);
        },
        preconditionResolver: (meta, client) => resolvePrecondition(meta, client)
      });
      this.container.register(Container.createToken<PrefixCommandRouter>("PrefixCommandRouter"), router);

      if (this.gateway) {
        this.gateway.onDispatch("MESSAGE_CREATE", async (data: any) => {
          if (data.author?.bot) return;
          await router.handleMessage(data);
        });
      }
    }
  }
}
