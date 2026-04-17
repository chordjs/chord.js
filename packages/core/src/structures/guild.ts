import type { Guild as APIGuild, Snowflake } from "@chord.js/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chord.js/utils";

/**
 * Represents a Discord Guild.
 */
export class Guild extends BaseEntity {
  public readonly id: Snowflake;
  public name?: string;
  public ownerId?: Snowflake;
  public memberCount?: number;

  public constructor(client: ChordClient, data: APIGuild) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.ownerId = data.owner_id;
    this.memberCount = data.member_count;
  }

  /**
   * Leaves the guild.
   */
  public async leave(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.userGuild("@me", this.id));
  }

  /**
   * Fetches the members of the guild. (Advanced placeholder)
   */
  public async fetchMembers(): Promise<unknown[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    return this.client.rest.get(Routes.guildMembers(this.id)) as Promise<unknown[]>;
  }

  public toJSON(): APIGuild {
    return {
      id: this.id,
      name: this.name,
      owner_id: this.ownerId,
      member_count: this.memberCount
    };
  }
}
