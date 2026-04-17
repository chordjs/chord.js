import type { AuditLog as APIAuditLog, AuditLogEntry as APIAuditLogEntry, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";
import { Collection } from "@chordjs/utils";

/**
 * Represents a Discord Audit Log.
 */
export class AuditLog extends BaseEntity {
  public readonly entries = new Collection<Snowflake, APIAuditLogEntry>();
  public readonly users = new Collection<Snowflake, User>();

  public constructor(client: ChordClient, data: APIAuditLog) {
    super(client);
    
    for (const entry of data.audit_log_entries) {
      this.entries.set(entry.id, entry);
    }

    for (const userData of data.users) {
      this.users.set(userData.id, new User(client, userData));
    }
  }

  public toJSON(): APIAuditLog {
    return {
      audit_log_entries: Array.from(this.entries.values()),
      users: Array.from(this.users.values()).map(u => u.toJSON()),
      integrations: [],
      webhooks: [],
      application_commands: [],
      auto_moderation_rules: [],
      guild_scheduled_events: [],
      threads: []
    } as APIAuditLog;
  }
}
