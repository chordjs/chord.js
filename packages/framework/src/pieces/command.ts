import { InteractionCommand, type InteractionCommandOptions, type InteractionRunContext, type PieceContext } from "@chordjs/interactions";
import { 
  getPreconditions, 
  getSubcommands as _getSubcommands, 
  getComponentHandlers as _getComponentHandlers 
} from "./decorators.js";

export interface CommandOptions extends InteractionCommandOptions {
  aliases?: string[];
}

export abstract class Command extends InteractionCommand {
  public readonly aliases: string[];

  protected constructor(context: PieceContext, options: CommandOptions = {}) {
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
    if (!context.interaction && context.args && context.args.length > 0) {
      const subcommands = _getSubcommands(this);
      const subName = context.args[0];
      const found = subcommands.find((s: any) => s.name === subName);
      if (found && typeof (this as any)[found.propertyKey] === "function") {
        // Shift args for the subcommand
        context.args.shift();
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
