import { Piece, type PieceContext } from "../structures/piece.js";
import type {
  APIEmbed,
  APIMessageTopLevelComponent,
  APIAllowedMentions,
  MessageFlags,
  GatewayDispatchDataMap
} from "@chord.js/types";

export interface ModalReplyPayload {
  content?: string;
  ephemeral?: boolean;
  tts?: boolean;
  embeds?: APIEmbed[];
  components?: APIMessageTopLevelComponent[];
  allowed_mentions?: APIAllowedMentions;
  flags?: MessageFlags;
}

export interface ModalDeferOptions {
  ephemeral?: boolean;
  flags?: MessageFlags;
}

export interface ModalContext {
  interaction: GatewayDispatchDataMap["INTERACTION_CREATE"];
  customId: string;
  fields: Map<string, string>; // customId -> value
  guildId?: string;
  channelId?: string;
  user?: Record<string, unknown>;
  member?: Record<string, unknown>;
  
  reply(payload: ModalReplyPayload): Promise<unknown>;
  deferReply(options?: ModalDeferOptions): Promise<unknown>;
  editReply(payload: ModalReplyPayload): Promise<unknown>;
  followUp(payload: ModalReplyPayload): Promise<unknown>;
}

export interface ModalPieceContext extends PieceContext {
  customId: string | RegExp;
}

export abstract class Modal extends Piece {
  public readonly customId: string | RegExp;

  protected constructor(context: ModalPieceContext) {
    super(context);
    this.customId = context.customId;
  }

  isMatch(customIdToTest: string): boolean {
    if (typeof this.customId === "string") {
      return this.customId === customIdToTest;
    }
    return this.customId.test(customIdToTest);
  }

  abstract run(context: ModalContext): unknown | Promise<unknown>;
}
