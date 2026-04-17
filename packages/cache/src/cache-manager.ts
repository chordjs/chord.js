import { BaseCache } from "./base-cache.js";
import type { User, Guild, Channel, GuildMember } from "@chord.js/types";

export interface CacheManagerOptions {
  users?: { maxSize?: number };
  guilds?: { maxSize?: number };
  channels?: { maxSize?: number };
  members?: { maxSize?: number }; // Note: Key is `${guildId}:${userId}`
}

export class CacheManager {
  public users: BaseCache<string, User>;
  public guilds: BaseCache<string, Guild>;
  public channels: BaseCache<string, Channel>;
  public members: BaseCache<string, GuildMember>; // key = `${guildId}:${userId}`

  constructor(options: CacheManagerOptions = {}) {
    this.users = new BaseCache<string, User>(options.users ?? { maxSize: 1000 });
    this.guilds = new BaseCache<string, Guild>(options.guilds ?? { maxSize: 1000 });
    this.channels = new BaseCache<string, Channel>(options.channels ?? { maxSize: 5000 });
    this.members = new BaseCache<string, GuildMember>(options.members ?? { maxSize: 5000 });
  }

  getMember(guildId: string, userId: string): GuildMember | undefined {
    return this.members.get(`${guildId}:${userId}`);
  }

  setMember(guildId: string, userId: string, member: GuildMember): void {
    this.members.set(`${guildId}:${userId}`, member);
  }

  deleteMember(guildId: string, userId: string): void {
    this.members.delete(`${guildId}:${userId}`);
  }

  sweepMembersByGuild(guildId: string): void {
    const prefix = `${guildId}:`;
    for (const key of this.members.keys()) {
      if (key.startsWith(prefix)) {
        this.members.delete(key);
      }
    }
  }

  clearAll(): void {
    this.users.clear();
    this.guilds.clear();
    this.channels.clear();
    this.members.clear();
  }
}
