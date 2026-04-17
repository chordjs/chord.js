import { Piece, type PieceContext } from "../structures/piece.js";
import type {
  APIAllowedMentions,
  APIEmbed,
  APIMessageReference,
  APIMessageTopLevelComponent,
  MessageFlags
} from "@chord.js/types";

export interface ApplicationCommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  autocomplete?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  options?: ApplicationCommandOption[];
}

export interface ApplicationCommandPayload {
  name: string;
  description?: string;
  type?: number;
  options?: ApplicationCommandOption[];
}

export interface InteractionCommandContext extends PieceContext {
  description?: string;
  type?: number;
  options?: ApplicationCommandOption[];
}

export interface InteractionRunContext {
  interaction: unknown;
  commandName: string;
  options: Record<string, unknown>;
  subcommand?: string;
  subcommandGroup?: string;
  focusedOption?: { name: string; value: unknown };
  guildId?: string;
  channelId?: string;
  user?: Record<string, unknown>;
  member?: Record<string, unknown>;
  resolved?: Record<string, unknown>;
  reply(payload: InteractionReplyPayload): Promise<unknown>;
  deferReply(options?: InteractionDeferOptions): Promise<unknown>;
  editReply(payload: InteractionReplyPayload): Promise<unknown>;
  followUp(payload: InteractionReplyPayload): Promise<unknown>;
}

export interface InteractionAutocompleteContext {
  interaction: unknown;
  commandName: string;
  options: Record<string, unknown>;
  subcommand?: string;
  subcommandGroup?: string;
  focusedOption?: { name: string; value: string | number };
  guildId?: string;
  channelId?: string;
  user?: Record<string, unknown>;
  member?: Record<string, unknown>;
  respond(choices: Array<{ name: string; value: string | number }>): Promise<unknown>;
}

export interface InteractionReplyPayload {
  content?: string;
  ephemeral?: boolean;
  tts?: boolean;
  embeds?: APIEmbed[];
  components?: APIMessageTopLevelComponent[];
  allowed_mentions?: APIAllowedMentions;
  message_reference?: APIMessageReference;
  flags?: MessageFlags;
}

export interface InteractionDeferOptions {
  ephemeral?: boolean;
  flags?: MessageFlags;
}

export abstract class InteractionCommand extends Piece {
  public readonly description: string;
  public readonly type?: number;
  public readonly options: ApplicationCommandOption[];

  protected constructor(context: InteractionCommandContext) {
    super(context);
    this.description = context.description ?? "";
    this.type = context.type;
    this.options = context.options ?? [];
  }

  toApplicationCommand(): ApplicationCommandPayload {
    const payload: ApplicationCommandPayload = {
      name: this.name,
    };
    if (this.description || !this.type || this.type === 1) {
      payload.description = this.description || this.name;
    }
    if (this.type) payload.type = this.type;
    if (this.options && this.options.length > 0) payload.options = this.options;
    return payload;
  }

  abstract run(context: InteractionRunContext): unknown | Promise<unknown>;

  autocomplete?(context: InteractionAutocompleteContext): unknown | Promise<unknown>;
}

