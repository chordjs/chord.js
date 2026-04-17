import type { Snowflake } from "./shared.js";

export interface SKU {
  id: Snowflake;
  type: number;
  application_id: Snowflake;
  name: string;
  slug: string;
  flags: number;
}

export interface Entitlement {
  id: Snowflake;
  sku_id: Snowflake;
  application_id: Snowflake;
  user_id?: Snowflake;
  guild_id?: Snowflake;
  type: number;
  deleted: boolean;
  starts_at?: string;
  ends_at?: string;
}
