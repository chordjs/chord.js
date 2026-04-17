import type { Webhook as APIWebhook, Snowflake, Message as APIMessage } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";
import { Message } from "./message.js";

/**
 * Represents a Discord Webhook.
 */
export class Webhook extends BaseEntity {
  public readonly id: Snowflake;
  public readonly type: number;
  public readonly guildId?: Snowflake | null;
  public readonly channelId: Snowflake | null;
  public readonly user?: User;
  public name: string | null;
  public avatar: string | null;
  public readonly token?: string;
  public readonly applicationId: Snowflake | null;

  public constructor(client: ChordClient, data: APIWebhook) {
    super(client);
    this.id = data.id;
    this.type = data.type;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    this.user = data.user ? new User(client, data.user) : undefined;
    this.name = data.name;
    this.avatar = data.avatar;
    this.token = data.token;
    this.applicationId = data.application_id;
  }

  /**
   * Executes the webhook to send a message.
   */
  public async send(content: string | Record<string, unknown>): Promise<Message | null> {
    if (!this.token) throw new Error("This webhook does not have a token and cannot be executed.");
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    const body = typeof content === "string" ? { content } : content;
    const data = await this.client.rest.post(`/webhooks/${this.id}/${this.token}?wait=true`, {
      body: JSON.stringify(body)
    }) as APIMessage;
    
    return data ? new Message(this.client, data) : null;
  }

  /**
   * Edits this webhook.
   */
  public async edit(options: { name?: string, avatar?: string | null, channel_id?: Snowflake }): Promise<Webhook> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    const data = await this.client.rest.patch(`/webhooks/${this.id}${this.token ? `/${this.token}` : ""}`, {
      body: JSON.stringify(options)
    }) as APIWebhook;
    
    return new Webhook(this.client, data);
  }

  /**
   * Deletes this webhook.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(`/webhooks/${this.id}${this.token ? `/${this.token}` : ""}`, {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  public toJSON(): APIWebhook {
    return {
      id: this.id,
      type: this.type,
      guild_id: this.guildId,
      channel_id: this.channelId,
      user: this.user?.toJSON(),
      name: this.name,
      avatar: this.avatar,
      token: this.token,
      application_id: this.applicationId
    };
  }
}
