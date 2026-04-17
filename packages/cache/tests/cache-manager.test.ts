import { test, expect } from "bun:test";
import { CacheManager } from "../src/cache-manager.js";

test("CacheManager > limits size according to options", () => {
  const manager = new CacheManager({ users: { maxSize: 2 } });
  
  manager.users.set("1", { id: "1", username: "a" } as any);
  manager.users.set("2", { id: "2", username: "b" } as any);
  manager.users.set("3", { id: "3", username: "c" } as any); // Should evict "1"

  expect(manager.users.size).toBe(2);
  expect(manager.users.has("1")).toBe(false);
  expect(manager.users.has("2")).toBe(true);
  expect(manager.users.has("3")).toBe(true);
});

test("CacheManager > handles member composite keys", () => {
  const manager = new CacheManager();
  
  manager.setMember("g1", "u1", { user: { id: "u1" } } as any);
  manager.setMember("g1", "u2", { user: { id: "u2" } } as any);
  manager.setMember("g2", "u1", { user: { id: "u1" } } as any);

  expect(manager.getMember("g1", "u1")).toBeDefined();
  expect(manager.members.size).toBe(3);

  manager.deleteMember("g1", "u1");
  expect(manager.getMember("g1", "u1")).toBeUndefined();
  expect(manager.members.size).toBe(2);

  manager.sweepMembersByGuild("g1");
  expect(manager.members.size).toBe(1); // Only g2:u1 should remain
  expect(manager.getMember("g2", "u1")).toBeDefined();
});
