import type { Message as APIMessage, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { User } from "./user.js";
import { Member } from "./member.js";
import { awaitComponents, awaitReactions, type CollectorOptions } from "../collectors/collector.js";
import type { Poll } from "@chordjs/types";

/**
 * Represents a Discord Message.
 */
export class Message extends BaseEntity {
  public readonly id: Snowflake;
  public readonly channelId: Snowflake;
  public readonly guildId?: Snowflake;
  public readonly content: string;
  public readonly author?: User;
  public readonly member?: Member;
  public readonly poll?: Poll;

  public constructor(client: ChordClient, data: APIMessage) {
    super(client);
    this.id = data.id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id;
    this.content = data.content;
    this.author = data.author ? new User(client, data.author) : undefined;
    this.member = (data.member && data.guild_id) ? new Member(client, data.guild_id, data.member) : undefined;
    this.poll = data.poll;
  }

  /**
   * Pins this message.
   */
  public async pin(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.put(Routes.channelPin(this.channelId, this.id));
  }

  /**
   * Unpins this message.
   */
  public async unpin(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.channelPin(this.channelId, this.id));
  }

  /**
   * Replies to this message.
   */
  public async reply(content: string | Record<string, unknown>): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof content === "string" ? { content } : content;
    const data = await this.client.rest.post(Routes.channelMessages(this.channelId), {
      body: JSON.stringify({
        ...body,
        message_reference: { message_id: this.id }
      })
    }) as APIMessage;
    return new Message(this.client, data);
  }

  /**
   * Edits this message.
   */
  public async edit(content: string | Record<string, unknown>): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof content === "string" ? { content } : content;
    const data = await this.client.rest.patch(Routes.channelMessage(this.channelId, this.id), {
      body: JSON.stringify(body)
    }) as APIMessage;
    return new Message(this.client, data);
  }

  /**
   * Deletes this message.
   */
  public async delete(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.channelMessage(this.channelId, this.id));
  }

  /**
   * Adds a reaction to this message.
   */
  public async react(emoji: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.put(Routes.channelMessageReactionUser(this.channelId, this.id, emoji, "@me"));
  }

  /**
   * Awaits reactions on this message.
   */
  public async awaitReactions(options: Omit<CollectorOptions<any>, "dispatcher">) {
    if (!this.client.gateway) throw new Error("Gateway client is not initialized.");
    return awaitReactions({
      ...options,
      dispatcher: this.client.gateway,
      messageId: this.id
    });
  }

  /**
   * Awaits components on this message.
   */
  public async awaitComponents(options: Omit<CollectorOptions<any>, "dispatcher">) {
    if (!this.client.gateway) throw new Error("Gateway client is not initialized.");
    return awaitComponents({
      ...options,
      dispatcher: this.client.gateway,
      messageId: this.id,
      channelId: this.channelId
    });
  }

  public toJSON(): APIMessage {
    return {
      id: this.id,
      channel_id: this.channelId,
      guild_id: this.guildId,
      content: this.content,
      author: this.author?.toJSON(),
      member: this.member?.toJSON()
    };
  }
}
