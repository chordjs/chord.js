import { test, expect } from "bun:test";
import { EmbedBuilder } from "../src/embed-builder.js";
import { PermissionsBitField } from "../src/permissions-bitfield.js";
import { Collection } from "../src/collection.js";

test("EmbedBuilder > fluently builds APIEmbed", () => {
  const embed = new EmbedBuilder()
    .setTitle("Hello")
    .setDescription("World")
    .setColor(0xff0000)
    .addFields({ name: "A", value: "B", inline: true })
    .toJSON();

  expect(embed.title).toBe("Hello");
  expect(embed.description).toBe("World");
  expect(embed.color).toBe(0xff0000);
  expect(embed.fields).toEqual([{ name: "A", value: "B", inline: true }]);
});

test("PermissionsBitField > resolves and checks bits correctly", () => {
  const perms = new PermissionsBitField(["SendMessages", "ViewChannel"]);
  
  expect(perms.has("SendMessages")).toBe(true);
  expect(perms.has(PermissionsBitField.Flags.SendMessages)).toBe(true);
  expect(perms.has("Administrator")).toBe(false);

  perms.add("Administrator");
  expect(perms.has("BanMembers")).toBe(true); // checkAdmin defaults to true

  perms.remove("Administrator");
  expect(perms.has("BanMembers")).toBe(false);

  const arr = perms.toArray();
  expect(arr).toContain("SendMessages");
  expect(arr).toContain("ViewChannel");
});

test("Collection > implements Map and adds array-like helpers", () => {
  const col = new Collection<string, number>();
  col.set("a", 1);
  col.set("b", 2);
  col.set("c", 3);

  const filtered = col.filter(v => v > 1);
  expect(filtered.size).toBe(2);
  expect(filtered.has("a")).toBe(false);

  expect(col.find(v => v === 2)).toBe(2);
  expect(col.map(v => v * 2)).toEqual([2, 4, 6]);
  expect(col.some(v => v > 2)).toBe(true);
  expect(col.every(v => v > 0)).toBe(true);
});
