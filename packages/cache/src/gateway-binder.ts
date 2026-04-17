import type { GatewayDispatchDataMap } from "@chord.js/types";
import type { CacheManager } from "./cache-manager.js";

export interface GatewayEventEmitter {
  onDispatch(event: string, handler: (data: any) => void | Promise<void>): unknown;
  offDispatch?(event: string, handler: (data: any) => void | Promise<void>): unknown;
}

export function bindCacheToGateway(manager: CacheManager, gateway: GatewayEventEmitter): void {
  gateway.onDispatch("GUILD_CREATE", (data: GatewayDispatchDataMap["GUILD_CREATE"]) => {
    // raw payload handling
    manager.guilds.set(data.id, data as any);
    
    // add channels
    if (Array.isArray(data.channels)) {
      for (const channel of data.channels) {
        manager.channels.set(channel.id, channel as any);
      }
    }

    // add members
    if (Array.isArray(data.members)) {
      for (const member of data.members) {
        if (member.user?.id) {
          manager.users.set(member.user.id, member.user as any);
          manager.setMember(data.id, member.user.id, member as any);
        }
      }
    }
  });

  gateway.onDispatch("GUILD_UPDATE", (data: GatewayDispatchDataMap["GUILD_UPDATE"]) => {
    manager.guilds.set(data.id, data as any);
  });

  gateway.onDispatch("GUILD_DELETE", (data: GatewayDispatchDataMap["GUILD_DELETE"]) => {
    manager.guilds.delete(data.id);
    manager.sweepMembersByGuild(data.id);
    // Note: We don't sweep channels to keep it simple, though ideally they should be swept.
  });

  gateway.onDispatch("CHANNEL_CREATE", (data: GatewayDispatchDataMap["CHANNEL_CREATE"]) => {
    manager.channels.set(data.id, data as any);
  });

  gateway.onDispatch("CHANNEL_UPDATE", (data: GatewayDispatchDataMap["CHANNEL_UPDATE"]) => {
    manager.channels.set(data.id, data as any);
  });

  gateway.onDispatch("CHANNEL_DELETE", (data: GatewayDispatchDataMap["CHANNEL_DELETE"]) => {
    manager.channels.delete(data.id);
  });

  gateway.onDispatch("GUILD_MEMBER_ADD", (data: GatewayDispatchDataMap["GUILD_MEMBER_ADD"]) => {
    if (data.user?.id && data.guild_id) {
      manager.users.set(data.user.id, data.user as any);
      manager.setMember(data.guild_id, data.user.id, data as any);
    }
  });

  gateway.onDispatch("GUILD_MEMBER_UPDATE", (data: GatewayDispatchDataMap["GUILD_MEMBER_UPDATE"]) => {
    if (data.user?.id && data.guild_id) {
      manager.users.set(data.user.id, data.user as any);
      const existing = manager.getMember(data.guild_id, data.user.id);
      manager.setMember(data.guild_id, data.user.id, { ...existing, ...data } as any);
    }
  });

  gateway.onDispatch("GUILD_MEMBER_REMOVE", (data: GatewayDispatchDataMap["GUILD_MEMBER_REMOVE"]) => {
    if (data.user?.id && data.guild_id) {
      manager.deleteMember(data.guild_id, data.user.id);
    }
  });

  // Extract objects on interaction
  gateway.onDispatch("INTERACTION_CREATE", (data: GatewayDispatchDataMap["INTERACTION_CREATE"]) => {
    if (data.user) {
      manager.users.set(data.user.id, data.user as any);
    }
    if (data.member && data.member.user && data.guild_id) {
      manager.users.set(data.member.user.id, data.member.user as any);
      manager.setMember(data.guild_id, data.member.user.id, data.member as any);
    }

    // resolved objects mapping
    const resolved = (data.data as any)?.resolved;
    if (resolved) {
      if (resolved.users) {
        for (const [id, user] of Object.entries(resolved.users)) {
          manager.users.set(id, user as any);
        }
      }
      if (resolved.members && data.guild_id) {
        for (const [id, partialMember] of Object.entries(resolved.members)) {
          const user = (resolved.users as any)?.[id];
          manager.setMember(data.guild_id, id, { ...partialMember as any, user } as any);
        }
      }
      if (resolved.channels) {
        for (const [id, channel] of Object.entries(resolved.channels)) {
          manager.channels.set(id, channel as any);
        }
      }
    }
  });
}
