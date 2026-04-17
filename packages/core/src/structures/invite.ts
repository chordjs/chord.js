import type { Invite as APIInvite, InviteMetadata as APIInviteMetadata, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";
import { Guild } from "./guild.js";
import { Channel } from "./channel.js";

/**
 * Represents a Discord Invite.
 */
export class Invite extends BaseEntity {
  public readonly code: string;
  public readonly guildId?: Snowflake;
  public readonly channelId?: Snowflake;
  public readonly inviter?: User;
  public readonly uses?: number;
  public readonly maxUses?: number;
  public readonly maxAge?: number;
  public readonly temporary?: boolean;
  public readonly createdAt?: string;
  public readonly expiresAt?: string | null;

  public constructor(client: ChordClient, data: APIInvite | APIInviteMetadata) {
    super(client);
    this.code = data.code;
    this.guildId = data.guild?.id;
    this.channelId = data.channel?.id;
    this.inviter = data.inviter ? new User(client, data.inviter) : undefined;
    this.expiresAt = data.expires_at;

    const metadata = data as APIInviteMetadata;
    if (metadata.created_at) {
      this.uses = metadata.uses;
      this.maxUses = metadata.max_uses;
      this.maxAge = metadata.max_age;
      this.temporary = metadata.temporary;
      this.createdAt = metadata.created_at;
    }
  }

  /**
   * Deletes this invite.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(`/invites/${this.code}`, {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  public toJSON(): APIInvite {
    return {
      code: this.code,
      expires_at: this.expiresAt,
      inviter: this.inviter?.toJSON()
      // Note: Full reconstruction of nested objects might be complex, keeping it simple for now
    } as APIInvite;
  }
}
