import { BaseManager } from "../structures/manager.js";
import { User } from "../structures/user.js";
import type { Snowflake, User as APIUser } from "@chordjs/types";
import { Routes } from "@chordjs/utils";

/**
 * Manager for Users.
 */
export class UserManager extends BaseManager<Snowflake, User> {
  /**
   * Resolves a user from the cache, or returns null if not cached.
   */
  public resolve(id: Snowflake): User | null {
    if (this.client.cache?.users) {
      const data = this.client.cache.users.get(id);
      if (data) return new User(this.client, data);
    }
    return null;
  }

  /**
   * Fetches a user from the API.
   */
  public async fetch(id: Snowflake): Promise<User> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    
    // Check cache first
    const cached = this.resolve(id);
    if (cached) return cached;

    const data = await this.client.rest.get(Routes.user(id)) as APIUser;
    const user = new User(this.client, data);

    // If cache is enabled, it should be auto-updated by the gateway binder,
    // but we can also manually upsert here if we want.
    if (this.client.cache?.users) {
      this.client.cache.users.set(id, data);
    }

    return user;
  }
}
