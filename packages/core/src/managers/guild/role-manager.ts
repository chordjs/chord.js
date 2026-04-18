import type { Role as APIRole, Snowflake } from "@chordjs/types";
import { BaseManager } from "../../structures/manager.js";
import { Role } from "../../structures/role.js";
import { Routes } from "@chordjs/utils";
import type { ChordClient } from "../../structures/chord-client.js";

/**
 * Manager for Guild Roles.
 */
export class GuildRoleManager extends BaseManager<Snowflake, Role> {
  public readonly guildId: Snowflake;

  constructor(client: ChordClient, guildId: Snowflake) {
    super(client);
    this.guildId = guildId;
  }

  /**
   * Resolves a role ID into a Role entity.
   */
  public async resolve(id: Snowflake): Promise<Role | null> {
    const roles = await this.fetchAll();
    return roles.find(r => r.id === id) ?? null;
  }

  /**
   * Fetches all roles in the guild.
   */
  public async fetchAll(): Promise<Role[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(Routes.guildRoles(this.guildId)) as APIRole[];
    return data.map(r => new Role(this.client, this.guildId, r));
  }

  /**
   * Creates a new role in the guild.
   */
  public async create(options: { 
    name?: string, 
    permissions?: string, 
    color?: number, 
    hoist?: boolean, 
    icon?: string | null, 
    unicode_emoji?: string | null, 
    mentionable?: boolean,
    reason?: string
  }): Promise<Role> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options;
    const data = await this.client.rest.post(Routes.guildRoles(this.guildId), {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIRole;
    return new Role(this.client, this.guildId, data);
  }

  /**
   * Modifies the positions of roles.
   */
  public async setPositions(positions: { id: Snowflake, position: number | null }[], reason?: string): Promise<Role[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(Routes.guildRoles(this.guildId), {
      body: JSON.stringify(positions),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIRole[];
    return data.map(r => new Role(this.client, this.guildId, r));
  }
}
