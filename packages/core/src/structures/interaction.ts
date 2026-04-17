import type { Interaction as APIInteraction, Snowflake, InteractionType } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";
import { Member } from "./member.js";
import { Message } from "./message.js";

export interface InteractionReplyOptions {
  content?: string;
  embeds?: any[];
  components?: any[];
  ephemeral?: boolean;
  flags?: number;
}

/**
 * Represents a Discord Interaction.
 */
export class Interaction extends BaseEntity {
  public readonly id: Snowflake;
  public readonly applicationId: Snowflake;
  public readonly type: InteractionType;
  public readonly token: string;
  public readonly guildId?: Snowflake;
  public readonly channelId?: Snowflake;
  public readonly user: User;
  public readonly member?: Member;
  public readonly message?: Message;

  public constructor(client: ChordClient, data: APIInteraction) {
    super(client);
    this.id = data.id;
    this.applicationId = data.application_id!;
    this.type = data.type;
    this.token = data.token!;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    
    if (data.member) {
      this.member = new Member(client, this.guildId!, data.member);
      this.user = this.member.user!;
    } else if (data.user) {
      this.user = new User(client, data.user);
    } else {
      this.user = new User(client, { id: "0", username: "Unknown" } as any);
    }

    if (data.message) {
      this.message = new Message(client, data.message);
    }
  }

  /**
   * Replies to the interaction.
   */
  public async reply(options: string | InteractionReplyOptions): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof options === "string" ? { content: options } : options;
    const flags = body.ephemeral ? (body.flags ?? 0) | (1 << 6) : body.flags;
    
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: { ...body, flags }
      })
    });
  }

  /**
   * Defers the reply.
   */
  public async deferReply(options?: { ephemeral?: boolean }): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const flags = options?.ephemeral ? 1 << 6 : 0;
    
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: { flags }
      })
    });
  }

  /**
   * Edits the original reply.
   */
  public async editReply(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof options === "string" ? { content: options } : options;
    const flags = body.ephemeral ? (body.flags ?? 0) | (1 << 6) : body.flags;
    
    const data = await this.client.rest.patch(`/webhooks/${this.applicationId}/${this.token}/messages/@original`, {
      body: JSON.stringify({ ...body, flags })
    }) as any;
    return new Message(this.client, data);
  }

  /**
   * Sends a follow-up message.
   */
  public async followUp(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof options === "string" ? { content: options } : options;
    const flags = body.ephemeral ? (body.flags ?? 0) | (1 << 6) : body.flags;

    const data = await this.client.rest.post(`/webhooks/${this.applicationId}/${this.token}`, {
      body: JSON.stringify({ ...body, flags })
    }) as any;
    return new Message(this.client, data);
  }

  public toJSON(): APIInteraction {
    return {
      id: this.id,
      application_id: this.applicationId,
      type: this.type,
      token: this.token,
      guild_id: this.guildId,
      channel_id: this.channelId,
      user: this.member ? undefined : this.user.toJSON(),
      member: this.member?.toJSON(),
      message: this.message?.toJSON()
    };
  }
}
