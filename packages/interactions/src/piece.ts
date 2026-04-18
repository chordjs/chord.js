import { Piece, type PieceContext, type PieceOptions } from "./base-piece.js";
import type {
  APIAllowedMentions,
  APIEmbed,
  APIMessageReference,
  APIMessageTopLevelComponent,
  MessageFlags
} from "@chordjs/types";
import {
  type User,
  type Member,
  type CommandInteraction,
  type AutocompleteInteraction
} from "@chordjs/core";

export interface ApplicationCommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  autocomplete?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  options?: ApplicationCommandOption[];
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
}

export interface ApplicationCommandPayload {
  name: string;
  description?: string;
  type?: number;
  options?: ApplicationCommandOption[];
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
}

export interface InteractionCommandOptions extends PieceOptions {
  description?: string;
  type?: number;
  options?: ApplicationCommandOption[];
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
}

export interface InteractionRunContext {
  interaction: CommandInteraction;
  commandName: string;
  options: Record<string, unknown>;
  subcommand?: string;
  subcommandGroup?: string;
  focusedOption?: { name: string; value: unknown };
  guildId?: string;
  channelId?: string;
  user?: User;
  member?: Member;
  resolved?: Record<string, unknown>;
  reply(payload: InteractionReplyPayload): Promise<unknown>;
  deferReply(options?: InteractionDeferOptions): Promise<unknown>;
  editReply(payload: InteractionReplyPayload): Promise<unknown>;
  followUp(payload: InteractionReplyPayload): Promise<unknown>;
}

export interface InteractionAutocompleteContext {
  interaction: AutocompleteInteraction;
  commandName: string;
  options: Record<string, unknown>;
  subcommand?: string;
  subcommandGroup?: string;
  focusedOption?: { name: string; value: string | number };
  guildId?: string;
  channelId?: string;
  user?: User;
  member?: Member;
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
  public readonly nameLocalizations?: Record<string, string>;
  public readonly descriptionLocalizations?: Record<string, string>;

  protected constructor(context: PieceContext, options: InteractionCommandOptions = {}) {
    super(context, options);
    this.description = options.description ?? "";
    this.type = options.type;
    this.options = options.options ?? [];
    this.nameLocalizations = options.nameLocalizations;
    this.descriptionLocalizations = options.descriptionLocalizations;
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
    if (this.nameLocalizations) payload.nameLocalizations = this.nameLocalizations;
    if (this.descriptionLocalizations) payload.descriptionLocalizations = this.descriptionLocalizations;
    return payload;
  }

  abstract run(context: InteractionRunContext): unknown | Promise<unknown>;

  autocomplete?(context: InteractionAutocompleteContext): unknown | Promise<unknown>;
}
