import type { User as APIUser, Snowflake } from "@chord.js/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";

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
   * Creates a DM channel with this user. (Advanced feature placeholder)
   */
  public async createDM(): Promise<unknown> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    return this.client.rest.post("/users/@me/channels", {
      body: JSON.stringify({ recipient_id: this.id })
    });
  }

  /**
   * Sends a message to this user.
   */
  public async send(content: string | Record<string, unknown>): Promise<unknown> {
    const dm = (await this.createDM()) as { id: string };
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof content === "string" ? { content } : content;
    return this.client.rest.post(`/channels/${dm.id}/messages`, {
      body: JSON.stringify(body)
    });
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
