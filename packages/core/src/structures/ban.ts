import type { Ban as APIBan } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";

/**
 * Represents a Discord Ban.
 */
export class Ban extends BaseEntity {
  public readonly reason: string | null;
  public readonly user: User;

  public constructor(client: ChordClient, data: APIBan) {
    super(client);
    this.reason = data.reason;
    this.user = new User(client, data.user);
  }

  public toJSON(): APIBan {
    return {
      reason: this.reason,
      user: this.user.toJSON()
    };
  }
}
