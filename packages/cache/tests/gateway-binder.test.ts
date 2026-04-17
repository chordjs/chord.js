import { test, expect } from "bun:test";
import { CacheManager } from "../src/cache-manager.js";
import { bindCacheToGateway, type GatewayEventEmitter } from "../src/gateway-binder.js";

class MockGateway implements GatewayEventEmitter {
  private handlers = new Map<string, Array<(data: any) => void>>();

  onDispatch(event: string, handler: (data: any) => void): unknown {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    return;
  }

  emit(event: string, data: any) {
    const arr = this.handlers.get(event) ?? [];
    for (const h of arr) h(data);
  }
}

test("gateway-binder > GUILD_CREATE updates caches", () => {
  const manager = new CacheManager();
  const gateway = new MockGateway();
  bindCacheToGateway(manager, gateway);

  gateway.emit("GUILD_CREATE", {
    id: "g1",
    name: "Test Guild",
    channels: [{ id: "c1", name: "general" }],
    members: [{ user: { id: "u1", username: "user1" }, nick: "u1" }]
  });

  expect(manager.guilds.get("g1")?.name).toBe("Test Guild");
  expect(manager.channels.get("c1")?.name).toBe("general");
  expect(manager.users.get("u1")?.username).toBe("user1");
  expect(manager.getMember("g1", "u1")?.nick).toBe("u1");
});

test("gateway-binder > INTERACTION_CREATE caches resolved items", () => {
  const manager = new CacheManager();
  const gateway = new MockGateway();
  bindCacheToGateway(manager, gateway);

  gateway.emit("INTERACTION_CREATE", {
    guild_id: "g1",
    user: { id: "u2", username: "user2" }, // Direct user
    data: {
      resolved: {
        users: { "u3": { id: "u3", username: "user3" } },
        members: { "u3": { nick: "user3_nick" } },
        channels: { "c2": { id: "c2", name: "voice" } }
      }
    }
  });

  expect(manager.users.get("u2")?.username).toBe("user2");
  expect(manager.users.get("u3")?.username).toBe("user3");
  expect(manager.channels.get("c2")?.name).toBe("voice");
  expect(manager.getMember("g1", "u3")?.nick).toBe("user3_nick");
  // Ensure the user was mixed into the member
  expect(manager.getMember("g1", "u3")?.user?.username).toBe("user3");
});
