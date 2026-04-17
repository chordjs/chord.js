import type { Role as APIRole, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { Routes } from "@chordjs/utils";

/**
 * Represents a Discord Role.
 */
export class Role extends BaseEntity {
  public readonly id: Snowflake;
  public readonly guildId: Snowflake;
  public name: string;
  public color: number;
  public hoist: boolean;
  public position: number;
  public permissions: string;
  public managed: boolean;
  public mentionable: boolean;

  public constructor(client: ChordClient, guildId: Snowflake, data: APIRole) {
    super(client);
    this.id = data.id;
    this.guildId = guildId;
    this.name = data.name;
    this.color = data.color;
    this.hoist = data.hoist;
    this.position = data.position;
    this.permissions = data.permissions;
    this.managed = data.managed;
    this.mentionable = data.mentionable;
  }

  /**
   * Edits the role.
   */
  public async edit(options: Record<string, unknown>, reason?: string): Promise<Role> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(Routes.guildRole(this.guildId, this.id), {
      body: JSON.stringify(options),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIRole;
    return new Role(this.client, this.guildId, data);
  }

  /**
   * Deletes the role.
   */
  public async delete(reason?: string): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.delete(Routes.guildRole(this.guildId, this.id), {
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    });
  }

  /**
   * Sets the position of the role.
   */
  public async setPosition(position: number, reason?: string): Promise<Role[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.patch(Routes.guildRoles(this.guildId), {
      body: JSON.stringify([{ id: this.id, position }]),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIRole[];
    return data.map(r => new Role(this.client, this.guildId, r));
  }

  public toJSON(): APIRole {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      hoist: this.hoist,
      position: this.position,
      permissions: this.permissions,
      managed: this.managed,
      mentionable: this.mentionable
    };
  }
}
