import { 
  InteractionCommand, 
  type InteractionCommandOptions, 
  type InteractionRunContext, 
  type PieceContext,
  runPreconditions,
  Precondition
} from "@chordjs/interactions";
import type { ChordClient } from "../structures/chord-client.js";
import { 
  getPreconditions, 
  getSubcommands as _getSubcommands, 
  getComponentHandlers as _getComponentHandlers 
} from "./decorators.js";

export interface CommandContext extends PieceContext {
  client: ChordClient;
  [key: string]: any;
}

export interface CommandOptions extends InteractionCommandOptions {
  aliases?: string[];
}

export abstract class Command<TContext extends CommandContext = CommandContext> extends InteractionCommand<TContext> {
  public readonly aliases: string[];
  #resolvedPreconditionsCache = new Map<string | undefined, any[]>();

  protected constructor(context: TContext, options: CommandOptions = {}) {
    super(context, options);
    this.aliases = options.aliases ?? [];
  }

  // Prefix 커맨드용 실행 메서드
  messageRun?(context: any): unknown | Promise<unknown>;

  // Slash 커맨드용 실행 메서드
  chatInputRun?(context: InteractionRunContext): unknown | Promise<unknown>;

  // User Context Menu용 실행 메서드
  userContextRun?(context: InteractionRunContext): unknown | Promise<unknown>;

  // Message Context Menu용 실행 메서드
  messageContextRun?(context: InteractionRunContext): unknown | Promise<unknown>;

  // InteractionCommand의 abstract run 구현 (호환성 유지)
  async run(context: any): Promise<unknown> {
    if (context.interaction) {
      const type = context.interaction.type; // This is actually the interaction type (2), not command type
      // We should check the underlying command type from interaction if possible, 
      // but usually we can just check which methods are implemented.
      
      // Better check: interaction.isCommand() and then check data.type
      if (typeof this.chatInputRun === "function") {
        return this.chatInputRun(context);
      }
      if (typeof this.userContextRun === "function") {
        return this.userContextRun(context);
      }
      if (typeof this.messageContextRun === "function") {
        return this.messageContextRun(context);
      }
    }

    // Prefix Subcommand handling
    if (!context.interaction && context.args && !context.args.finished) {
      const subcommands = _getSubcommands(this);
      const subName = context.args.peek();
      const lookup = context.caseInsensitive ? subName?.toLowerCase() : subName;
      
      const found = subcommands.find((s: any) => {
        const name = context.caseInsensitive ? s.name.toLowerCase() : s.name;
        return name === lookup;
      });

      if (found && typeof (this as any)[found.propertyKey] === "function") {
        // Run preconditions for the subcommand if they exist
        const propertyKey = found.propertyKey as string;
        let resolved = this.#resolvedPreconditionsCache.get(propertyKey);

        if (!resolved && context.preconditionResolver) {
          const metaPreconditions = this.getEffectivePreconditions(propertyKey);
          if (metaPreconditions.length > 0) {
            const client = context.client || (this as any).client;
            resolved = metaPreconditions
              .map(p => context.preconditionResolver!(p, client))
              .filter(p => p !== null);
            this.#resolvedPreconditionsCache.set(propertyKey, resolved);
          }
        }

        if (resolved && resolved.length > 0) {
          const result = await runPreconditions(resolved, context);
          if (!result.ok) {
            throw new Error(result.reason ?? "Precondition failed");
          }
        }

        // Shift args for the subcommand by advancing the index
        context.args.next();
        return (this as any)[found.propertyKey](context);
      }
    }

    if (typeof this.messageRun === "function") {
      return this.messageRun(context);
    }
    return null;
  }

  /**
   * Returns all preconditions for this command, combining class and method level.
   */
  public getEffectivePreconditions(methodName?: string): any[] {
    const classPreconditions = getPreconditions(this.constructor);
    const methodPreconditions = methodName ? getPreconditions(this, methodName) : [];
    return [...classPreconditions, ...methodPreconditions];
  }

  /**
   * Compatibility for InteractionCommand.getPreconditions
   */
  public getPreconditions(methodName?: string): any[] {
    return this.getEffectivePreconditions(methodName);
  }

  /**
   * Compatibility for InteractionCommand.getSubcommands
   */
  public getSubcommands(): Array<{ name: string; propertyKey: string | symbol }> {
    return _getSubcommands(this);
  }

  /**
   * Compatibility for InteractionCommandRouter to find component handlers
   */
  public getComponentHandlers(): Array<{ customId: string | RegExp; propertyKey: string | symbol }> {
    return _getComponentHandlers(this);
  }
}
