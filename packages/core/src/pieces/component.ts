import { Piece, type PieceContext } from "../structures/piece.js";
import type {
  APIEmbed,
  APIMessageTopLevelComponent,
  APIAllowedMentions,
  MessageFlags,
  GatewayDispatchDataMap
} from "@chord.js/types";

export interface ComponentReplyPayload {
  content?: string;
  ephemeral?: boolean;
  tts?: boolean;
  embeds?: APIEmbed[];
  components?: APIMessageTopLevelComponent[];
  allowed_mentions?: APIAllowedMentions;
  flags?: MessageFlags;
}

export interface ComponentDeferOptions {
  ephemeral?: boolean;
  flags?: MessageFlags;
  // type 6: DEFERRED_UPDATE_MESSAGE
  update?: boolean;
}

export interface ComponentContext {
  interaction: GatewayDispatchDataMap["INTERACTION_CREATE"];
  customId: string;
  componentType: number;
  values?: string[]; // for select menus
  message?: unknown;
  guildId?: string;
  channelId?: string;
  user?: Record<string, unknown>;
  member?: Record<string, unknown>;
  
  reply(payload: ComponentReplyPayload): Promise<unknown>;
  deferReply(options?: ComponentDeferOptions): Promise<unknown>;
  editReply(payload: ComponentReplyPayload): Promise<unknown>;
  followUp(payload: ComponentReplyPayload): Promise<unknown>;
  updateMessage(payload: ComponentReplyPayload): Promise<unknown>;
}

export interface ComponentPieceContext extends PieceContext {
  customId: string | RegExp;
}

export abstract class Component extends Piece {
  public readonly customId: string | RegExp;

  protected constructor(context: ComponentPieceContext) {
    super(context);
    this.customId = context.customId;
  }

  isMatch(customIdToTest: string): boolean {
    if (typeof this.customId === "string") {
      return this.customId === customIdToTest;
    }
    return this.customId.test(customIdToTest);
  }

  abstract run(context: ComponentContext): unknown | Promise<unknown>;
}
