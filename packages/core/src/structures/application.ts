import type { Application as APIApplication, Team as APITeam, TeamMember as APITeamMember, Snowflake } from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";

/**
 * Represents a Discord Application.
 */
export class Application extends BaseEntity {
  public readonly id: Snowflake;
  public name: string;
  public icon: string | null;
  public description: string;
  public rpcOrigins?: string[];
  public botPublic: boolean;
  public botRequireCodeGrant: boolean;
  public termsOfServiceUrl?: string;
  public privacyPolicyUrl?: string;
  public owner?: Partial<User>;
  public summary: string;
  public verifyKey: string;
  public team: Team | null;
  public guildId?: Snowflake;
  public primarySkuId?: Snowflake;
  public slug?: string;
  public coverImage?: string;
  public flags?: number;
  public tags?: string[];

  constructor(client: ChordClient, data: APIApplication) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon;
    this.description = data.description;
    this.rpcOrigins = data.rpc_origins;
    this.botPublic = data.bot_public;
    this.botRequireCodeGrant = data.bot_require_code_grant;
    this.termsOfServiceUrl = data.terms_of_service_url;
    this.privacyPolicyUrl = data.privacy_policy_url;
    this.owner = data.owner ? new User(client, data.owner as any) : undefined;
    this.summary = data.summary;
    this.verifyKey = data.verify_key;
    this.team = data.team ? new Team(client, data.team) : null;
    this.guildId = data.guild_id;
    this.primarySkuId = data.primary_sku_id;
    this.slug = data.slug;
    this.coverImage = data.cover_image;
    this.flags = data.flags;
    this.tags = data.tags;
  }

  public toJSON(): APIApplication {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      description: this.description,
      summary: this.summary,
      verify_key: this.verifyKey,
      bot_public: this.botPublic,
      bot_require_code_grant: this.botRequireCodeGrant,
      team: this.team?.toJSON() as any
    } as APIApplication;
  }
}

/**
 * Represents a Discord Team.
 */
export class Team extends BaseEntity {
  public readonly id: Snowflake;
  public icon: string | null;
  public members: TeamMember[];
  public name: string;
  public ownerUserId: Snowflake;

  constructor(client: ChordClient, data: APITeam) {
    super(client);
    this.id = data.id;
    this.icon = data.icon;
    this.members = data.members.map(m => new TeamMember(client, m));
    this.name = data.name;
    this.ownerUserId = data.owner_user_id;
  }

  public toJSON(): APITeam {
    return {
      id: this.id,
      icon: this.icon,
      name: this.name,
      owner_user_id: this.ownerUserId,
      members: this.members.map(m => m.toJSON())
    };
  }
}

/**
 * Represents a Discord Team Member.
 */
export class TeamMember extends BaseEntity {
  public membershipState: number;
  public permissions: string[];
  public teamId: Snowflake;
  public user: User;

  constructor(client: ChordClient, data: APITeamMember) {
    super(client);
    this.membershipState = data.membership_state;
    this.permissions = data.permissions;
    this.teamId = data.team_id;
    this.user = new User(client, data.user as any);
  }

  public toJSON(): APITeamMember {
    return {
      membership_state: this.membershipState,
      permissions: this.permissions,
      team_id: this.teamId,
      user: this.user.toJSON() as any
    };
  }
}
