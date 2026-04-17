import type { Channel as APIChannel, Snowflake, ChannelType, ThreadMetadata } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { awaitMessages, type CollectorOptions } from "../collectors/collector.js";
import { Message } from "./message.js";
import type { Message as APIMessage } from "@chordjs/types";

/**
 * Represents a Discord Channel.
 */
export class Channel extends BaseEntity {
  public readonly id: Snowflake;
  public readonly type: ChannelType;
  public guildId?: Snowflake;
  public name?: string | null;
  public topic?: string | null;
  public parentId?: Snowflake | null;
  public nsfw?: boolean;
  public lastMessageId?: Snowflake | null;
  public threadMetadata?: ThreadMetadata;

  public constructor(client: ChordClient, data: APIChannel) {
    super(client);
    this.id = data.id;
    this.type = data.type as ChannelType;
    this.guildId = data.guild_id;
    this.name = data.name;
    this.topic = data.topic;
    this.parentId = data.parent_id;
    this.nsfw = data.nsfw;
    this.lastMessageId = data.last_message_id;
    this.threadMetadata = data.thread_metadata;
  }

  /**
   * Sends a message to this channel.
   */
  public async send(content: string | Record<string, unknown>): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof content === "string" ? { content } : content;
    const data = await this.client.rest.post(Routes.channelMessages(this.id), {
      body: JSON.stringify(body)
    }) as APIMessage;
    return new Message(this.client, data);
  }

  /**
   * Edits the channel.
   */
  public async edit(options: Record<string, unknown>, reason?: string): Promise<Channel> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(Routes.channel(this.id), {
      body: JSON.stringify(options),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIChannel;
    return new Channel(this.client, data);
  }

  /**
   * Triggers the typing indicator in this channel.
   */
  public async triggerTyping(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.post(Routes.channelTyping(this.id));
  }

  /**
   * Deletes the channel.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.channel(this.id), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Bulk deletes messages.
   */
  public async bulkDelete(messages: Snowflake[] | Message[], reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const ids = messages.map(m => typeof m === "string" ? m : m.id);
    await this.client.rest.post(Routes.channelBulkDelete(this.id), {
      body: JSON.stringify({ messages: ids }),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Fetches a specific message from this channel.
   */
  public async fetchMessage(messageId: Snowflake): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(Routes.channelMessage(this.id, messageId)) as APIMessage;
    return new Message(this.client, data);
  }

  /**
   * Fetches recent messages from this channel.
   */
  public async fetchMessages(options?: { around?: Snowflake, before?: Snowflake, after?: Snowflake, limit?: number }): Promise<Message[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const query = new URLSearchParams();
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) query.append(key, String(value));
      }
    }
    const path = `${Routes.channelMessages(this.id)}${query.toString() ? `?${query.toString()}` : ''}`;
    const data = await this.client.rest.get(path) as APIMessage[];
    return data.map(m => new Message(this.client, m));
  }

  /**
   * Awaits messages in this channel.
   */
  public async awaitMessages(options: Omit<CollectorOptions<any>, "dispatcher">) {
    if (!this.client.gateway) throw new Error("Gateway client is not initialized.");
    return awaitMessages({
      ...options,
      dispatcher: this.client.gateway,
      channelId: this.id
    });
  }

  /**
   * Creates a thread in this channel.
   */
  public async createThread(options: { 
    name: string, 
    auto_archive_duration?: number, 
    type?: number, 
    invitable?: boolean,
    reason?: string,
    messageId?: Snowflake // If provided, starts thread from message
  }): Promise<Channel> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, messageId, ...body } = options;
    const path = messageId 
      ? `/channels/${this.id}/messages/${messageId}/threads`
      : `/channels/${this.id}/threads`;
    
    const data = await this.client.rest.post(path, {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIChannel;
    return new Channel(this.client, data);
  }

  /**
   * Fetches pinned messages in this channel.
   */
  public async fetchPinnedMessages(): Promise<Message[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/channels/${this.id}/pins`) as APIMessage[];
    return data.map(m => new Message(this.client, m));
  }

  /**
   * Pins a message in this channel.
   */
  public async pinMessage(messageId: Snowflake): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.put(`/channels/${this.id}/pins/${messageId}`);
  }

  /**
   * Unpins a message in this channel.
   */
  public async unpinMessage(messageId: Snowflake): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(`/channels/${this.id}/pins/${messageId}`);
  }

  public toJSON(): APIChannel {
    return {
      id: this.id,
      type: this.type,
      guild_id: this.guildId,
      name: this.name
    };
  }
}
