import type { SKU as APISKU, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";

/**
 * Represents a Discord SKU (Store Keeping Unit).
 */
export class SKU extends BaseEntity {
  public readonly id: Snowflake;
  public readonly type: number;
  public readonly applicationId: Snowflake;
  public readonly name: string;
  public readonly slug: string;
  public readonly flags: number;

  public constructor(client: ChordClient, data: APISKU) {
    super(client);
    this.id = data.id;
    this.type = data.type;
    this.applicationId = data.application_id;
    this.name = data.name;
    this.slug = data.slug;
    this.flags = data.flags;
  }

  public toJSON(): APISKU {
    return {
      id: this.id,
      type: this.type,
      application_id: this.applicationId,
      name: this.name,
      slug: this.slug,
      flags: this.flags
    };
  }
}
