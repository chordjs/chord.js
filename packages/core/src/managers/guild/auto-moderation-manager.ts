import type { AutoModerationRule as APIAutoModerationRule, AutoModerationAction, Snowflake } from "@chordjs/types";
import { BaseManager } from "../../structures/manager.js";
import { AutoModerationRule } from "../../structures/auto-moderation-rule.js";
import type { ChordClient } from "../../structures/chord-client.js";

/**
 * Manager for Auto Moderation Rules.
 */
export class AutoModerationManager extends BaseManager<Snowflake, AutoModerationRule> {
  public readonly guildId: Snowflake;

  constructor(client: ChordClient, guildId: Snowflake) {
    super(client);
    this.guildId = guildId;
  }

  /**
   * Resolves a rule ID into an AutoModerationRule entity.
   */
  public async resolve(id: Snowflake): Promise<AutoModerationRule | null> {
    try {
      return await this.fetch(id);
    } catch {
      return null;
    }
  }

  /**
   * Fetches a rule by its ID.
   */
  public async fetch(ruleId: Snowflake): Promise<AutoModerationRule> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.guildId}/auto-moderation/rules/${ruleId}`) as APIAutoModerationRule;
    return new AutoModerationRule(this.client, data);
  }

  /**
   * Fetches all rules in the guild.
   */
  public async fetchAll(): Promise<AutoModerationRule[]> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const data = await this.client.rest.get(`/guilds/${this.guildId}/auto-moderation/rules`) as APIAutoModerationRule[];
    return data.map(r => new AutoModerationRule(this.client, r));
  }

  /**
   * Creates a new auto moderation rule.
   */
  public async create(options: {
    name: string,
    event_type: number,
    trigger_type: number,
    trigger_metadata?: any,
    actions: AutoModerationAction[],
    enabled?: boolean,
    exempt_roles?: Snowflake[],
    exempt_channels?: Snowflake[],
    reason?: string
  }): Promise<AutoModerationRule> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const { reason, ...body } = options;
    const data = await this.client.rest.post(`/guilds/${this.guildId}/auto-moderation/rules`, {
      body: JSON.stringify(body),
      headers: reason ? { "X-Audit-Log-Reason": reason } : undefined
    }) as APIAutoModerationRule;
    return new AutoModerationRule(this.client, data);
  }
}
