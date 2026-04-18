import type { Snowflake } from "./shared.js";
import type { User } from "./user.js";

export interface Application {
  id: Snowflake;
  name: string;
  icon: string | null;
  description: string;
  rpc_origins?: string[];
  bot_public: boolean;
  bot_require_code_grant: boolean;
  terms_of_service_url?: string;
  privacy_policy_url?: string;
  owner?: Partial<User>;
  summary: string;
  verify_key: string;
  team: Team | null;
  guild_id?: Snowflake;
  primary_sku_id?: Snowflake;
  slug?: string;
  cover_image?: string;
  flags?: number;
  tags?: string[];
  install_params?: any;
  custom_install_url?: string;
  role_connections_verification_url?: string;
}

export interface Team {
  icon: string | null;
  id: Snowflake;
  members: TeamMember[];
  name: string;
  owner_user_id: Snowflake;
}

export interface TeamMember {
  membership_state: number;
  permissions: string[];
  team_id: Snowflake;
  user: Partial<User>;
}

export interface ApplicationRoleConnectionMetadata {
  type: number;
  key: string;
  name: string;
  name_localizations?: Record<string, string>;
  description: string;
  description_localizations?: Record<string, string>;
}
