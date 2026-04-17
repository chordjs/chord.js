import type { User as APIUser, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { Channel } from "./channel.js";
import { Message } from "./message.js";
import type { Channel as APIChannel, Message as APIMessage } from "@chordjs/types";

/**
 * Represents a Discord User.
 */
export class User extends BaseEntity {
  public readonly id: Snowflake;
  public username: string;
  public discriminator: string;
  public avatar: string | null;
  public bot: boolean;
  public system: boolean;

  public constructor(client: ChordClient, data: APIUser) {
    super(client);
    this.id = data.id;
    this.username = data.username ?? "Unknown";
    this.discriminator = data.discriminator ?? "0000";
    this.avatar = data.avatar ?? null;
    this.bot = data.bot ?? false;
    this.system = data.system ?? false;
  }

  /**
   * The tag of the user (username#discriminator).
   */
  public get tag(): string {
    return `${this.username}#${this.discriminator}`;
  }

  /**
   * Creates a DM channel with this user.
   */
  public async createDM(): Promise<Channel> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.post(Routes.userChannels(), {
      body: JSON.stringify({ recipient_id: this.id })
    }) as APIChannel;
    return new Channel(this.client, data);
  }

  /**
   * Sends a message to this user.
   */
  public async send(content: string | Record<string, unknown>): Promise<Message> {
    const dm = await this.createDM();
    return dm.send(content) as unknown as Promise<Message>; // Will fix Channel.send to return Message
  }

  public toJSON(): APIUser {
    return {
      id: this.id,
      username: this.username,
      discriminator: this.discriminator,
      avatar: this.avatar,
      bot: this.bot,
      system: this.system
    };
  }
}
