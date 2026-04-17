/// <reference types="bun-types" />
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChordClient, PieceLoader, Command, Listener, Piece } from "../src/index.js";

// ---------------------------------------------------------------------------
// Helpers — create temp module files for loading
// ---------------------------------------------------------------------------

let testDir: string;

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), "chord-loader-test-"));
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

async function writeModule(relPath: string, content: string): Promise<string> {
  const full = join(testDir, relPath);
  const dir = full.substring(0, full.lastIndexOf("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(full, content, "utf8");
  return full;
}

// ===========================================================================
// Tests
// ===========================================================================

describe("PieceLoader", () => {
  test("loadCommandsFrom loads class-based commands", async () => {
    const dir = join(testDir, "cmds-class");
    await mkdir(dir, { recursive: true });

    await writeFile(
      join(dir, "greet.ts"),
      `
import { Command } from "${join(process.cwd(), "packages/core/src/index.js")}";
export default class Greet extends Command {
  constructor(context: any) { super(context || {}, { name: "greet", description: "say hi" }); }
  run() { return "hi"; }
}
`,
      "utf8"
    );

    const client = new ChordClient();
    const loader = new PieceLoader({ client });
    const commands = await loader.loadCommandsFrom(dir);

    expect(commands.length).toBe(1);
    expect(commands[0]!.name).toBe("greet");
    expect(commands[0]).toBeInstanceOf(Command);
  });

  test("loadCommandsFrom loads instance-based commands", async () => {
    const dir = join(testDir, "cmds-instance");
    await mkdir(dir, { recursive: true });

    await writeFile(
      join(dir, "hello.ts"),
      `
import { Command } from "${join(process.cwd(), "packages/core/src/index.js")}";
class Hello extends Command {
  constructor(context: any) { super(context || {}, { name: "hello" }); }
  run() {}
}
export default new Hello();
`,
      "utf8"
    );

    const client = new ChordClient();
    const loader = new PieceLoader({ client });
    const commands = await loader.loadCommandsFrom(dir);

    expect(commands.length).toBe(1);
    expect(commands[0]!.name).toBe("hello");
  });

  test("loadCommandsFrom loads factory-based commands", async () => {
    const dir = join(testDir, "cmds-factory");
    await mkdir(dir, { recursive: true });

    await writeFile(
      join(dir, "factory.ts"),
      `
import { Command } from "${join(process.cwd(), "packages/core/src/index.js")}";
class FactoryCmd extends Command {
  constructor(ctx: { name: string }) { super(ctx as any, { name: ctx.name }); }
  run() {}
}
export default (ctx: { name: string }) => new FactoryCmd(ctx);
`,
      "utf8"
    );

    const client = new ChordClient();
    const loader = new PieceLoader({ client });
    const commands = await loader.loadCommandsFrom(dir);

    expect(commands.length).toBe(1);
    expect(commands[0]!.name).toBe("factory");
  });

  test("loadListenersFrom loads listeners", async () => {
    const dir = join(testDir, "listeners");
    await mkdir(dir, { recursive: true });

    await writeFile(
      join(dir, "on-ready.ts"),
      `
import { Listener } from "${join(process.cwd(), "packages/core/src/index.js")}";
export default class OnReady extends Listener {
  constructor(context: any) { super(context || {}, { name: "on-ready", event: "READY" }); }
  run() {}
}
`,
      "utf8"
    );

    const client = new ChordClient();
    const loader = new PieceLoader({ client });
    const listeners = await loader.loadListenersFrom(dir);

    expect(listeners.length).toBe(1);
    expect(listeners[0]!.name).toBe("on-ready");
    expect(listeners[0]!.event).toBe("READY");
    expect(listeners[0]).toBeInstanceOf(Listener);
  });

  test("loadCommandsFrom recursively walks subdirectories", async () => {
    const dir = join(testDir, "cmds-nested");
    await mkdir(join(dir, "admin"), { recursive: true });

    await writeFile(
      join(dir, "ping.ts"),
      `
import { Command } from "${join(process.cwd(), "packages/core/src/index.js")}";
export default class Ping extends Command {
  constructor(context: any) { super(context || {}, { name: "ping" }); }
  run() {}
}
`,
      "utf8"
    );

    await writeFile(
      join(dir, "admin", "ban.ts"),
      `
import { Command } from "${join(process.cwd(), "packages/core/src/index.js")}";
export default class Ban extends Command {
  constructor(context: any) { super(context || {}, { name: "ban" }); }
  run() {}
}
`,
      "utf8"
    );

    const client = new ChordClient();
    const loader = new PieceLoader({ client });
    const commands = await loader.loadCommandsFrom(dir);

    expect(commands.length).toBe(2);
    const names = commands.map((c) => c.name).sort();
    expect(names).toEqual(["ban", "ping"]);
  });

  test("skips non-module files (.json, .d.ts)", async () => {
    const dir = join(testDir, "cmds-skip");
    await mkdir(dir, { recursive: true });

    await writeFile(join(dir, "config.json"), "{}");
    await writeFile(join(dir, "types.d.ts"), "export {};");
    await writeFile(
      join(dir, "real.ts"),
      `
import { Command } from "${join(process.cwd(), "packages/core/src/index.js")}";
export default class Real extends Command {
  constructor(context: any) { super(context || {}, { name: "real" }); }
  run() {}
}
`,
      "utf8"
    );

    const client = new ChordClient();
    const loader = new PieceLoader({ client });
    const commands = await loader.loadCommandsFrom(dir);

    expect(commands.length).toBe(1);
    expect(commands[0]!.name).toBe("real");
  });

  test("ensureStore creates store if not exists, reuses if exists", () => {
    const client = new ChordClient();
    const loader = new PieceLoader({ client });

    const store1 = loader.ensureStore("test-store");
    const store2 = loader.ensureStore("test-store");
    expect(store1).toBe(store2);
  });

  test("loaded pieces are registered in the store", async () => {
    const dir = join(testDir, "cmds-store-check");
    await mkdir(dir, { recursive: true });

    await writeFile(
      join(dir, "stored.ts"),
      `
import { Command } from "${join(process.cwd(), "packages/core/src/index.js")}";
export default class Stored extends Command {
  constructor(context: any) { super(context || {}, { name: "stored" }); }
  run() {}
}
`,
      "utf8"
    );

    const client = new ChordClient();
    const loader = new PieceLoader({ client });
    await loader.loadCommandsFrom(dir);

    const store = client.store<Command>("commands");
    expect(store.get("stored")).toBeDefined();
    expect(store.size).toBe(1);
  });
});
