import type { Channel as APIChannel, Snowflake, ChannelType } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { awaitMessages, type CollectorOptions } from "../collectors/collector.js";

/**
 * Represents a Discord Channel.
 */
export class Channel extends BaseEntity {
  public readonly id: Snowflake;
  public readonly type: ChannelType;
  public guildId?: Snowflake;
  public name?: string | null;

  public constructor(client: ChordClient, data: APIChannel) {
    super(client);
    this.id = data.id;
    this.type = data.type as ChannelType;
    this.guildId = data.guild_id;
    this.name = data.name;
  }

  /**
   * Sends a message to this channel.
   */
  public async send(content: string | Record<string, unknown>): Promise<unknown> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof content === "string" ? { content } : content;
    return this.client.rest.post(Routes.channelMessages(this.id), {
      body: JSON.stringify(body)
    });
  }

  /**
   * Deletes the channel.
   */
  public async delete(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.channel(this.id));
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

  public toJSON(): APIChannel {
    return {
      id: this.id,
      type: this.type,
      guild_id: this.guildId,
      name: this.name
    };
  }
}
