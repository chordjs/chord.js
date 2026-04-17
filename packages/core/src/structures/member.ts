import type { GuildMember as APIGuildMember, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";
import { User } from "./user.js";

/**
 * Represents a Discord Guild Member.
 */
export class Member extends BaseEntity {
  public readonly user?: User;
  public readonly nick: string | null;
  public readonly roles: Snowflake[];
  public readonly guildId: Snowflake;

  public constructor(client: ChordClient, guildId: Snowflake, data: APIGuildMember) {
    super(client);
    this.guildId = guildId;
    this.user = data.user ? new User(client, data.user) : undefined;
    this.nick = data.nick ?? null;
    this.roles = data.roles;
  }

  /**
   * The display name of the member.
   */
  public get displayName(): string {
    return this.nick ?? this.user?.username ?? "Unknown Member";
  }

  /**
   * Kicks the member from the guild.
   */
  public async kick(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    if (!this.user) throw new Error("Cannot kick a member with no user data.");
    await this.client.rest.delete(Routes.guildMember(this.guildId, this.user.id));
  }

  /**
   * Bans the member from the guild.
   */
  public async ban(options: { deleteMessageSeconds?: number; reason?: string } = {}): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    if (!this.user) throw new Error("Cannot ban a member with no user data.");
    await this.client.rest.put(Routes.guildBan(this.guildId, this.user.id), {
      body: JSON.stringify({
        delete_message_seconds: options.deleteMessageSeconds,
        reason: options.reason
      })
    });
  }

  public toJSON(): APIGuildMember {
    return {
      user: this.user?.toJSON(),
      nick: this.nick,
      roles: this.roles,
      joined_at: new Date().toISOString(), // Fallback
      deaf: false,
      mute: false
    };
  }
}
