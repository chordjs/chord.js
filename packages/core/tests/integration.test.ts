import { describe, expect, test } from "bun:test";
import {
  ChordClient,
  type InteractionRunContext,
  InteractionCommand,
  InteractionCommandRouter,
  PrefixCommandRouter,
  guildOnly,
  ownerOnly,
  cooldown,
  hasPermissions,
  type InteractionDispatchSource,
  Command,
  type PrefixReplyPayload
} from "../src/index.js";

class MockGateway implements InteractionDispatchSource {
  private handlers = new Set<(data: any) => void | Promise<void>>();

  onDispatch(event: "INTERACTION_CREATE", handler: (data: any) => void | Promise<void>): unknown {
    if (event === "INTERACTION_CREATE") this.handlers.add(handler);
  }

  offDispatch(event: "INTERACTION_CREATE", handler: (data: any) => void | Promise<void>): unknown {
    if (event === "INTERACTION_CREATE") this.handlers.delete(handler);
  }

  async emitInteraction(data: any): Promise<void> {
    if (data.type === undefined) data.type = 2; // Default to ApplicationCommand
    for (const handler of this.handlers) await handler(data);
  }
}

class MockRest {
  lastRequest: { method: string; path: string; init?: RequestInit } | null = null;
  requests: Array<{ method: string; path: string; init?: RequestInit }> = [];

  async request<T = unknown>(method: string, path: string, init?: RequestInit): Promise<T> {
    this.lastRequest = { method, path, init };
    this.requests.push({ method, path, init });
    return undefined as T;
  }
}

describe("core integration", () => {
  test("prefix router executes matching command", async () => {
    const client = new ChordClient();
    const store = client.createStore<Command>("commands");

    let called = false;
    class Ping extends Command {
      constructor(context?: any) {
        super(context || {} as any, { name: "ping" });
      }
      run(): void {
        called = true;
      }
    }

    await store.set(new Ping());
    const router = new PrefixCommandRouter({ client, prefix: "!" });

    const handled = await router.handleMessage({ content: "!ping" });
    expect(handled).toBe(true);
    expect(called).toBe(true);
  });

  test("interaction router registers and executes command", async () => {
    const client = new ChordClient();
    const store = client.createStore<InteractionCommand>("interactions");
    const gateway = new MockGateway();
    const rest = new MockRest();
    let observedGuildId: string | undefined;
    let observedChannelId: string | undefined;
    let observedUserId: string | undefined;
    let observedMemberPresent = false;
    let observedResolvedPresent = false;

    let called = false;
    class Hello extends InteractionCommand {
      constructor(context?: any) {
        super(context || {} as any, { name: "hello", description: "hello command" });
      }
      async run(context: InteractionRunContext): Promise<void> {
        observedGuildId = context.guildId;
        observedChannelId = context.channelId;
        observedUserId = (context.user as { id?: string } | undefined)?.id;
        observedMemberPresent = context.member !== undefined;
        observedResolvedPresent = context.resolved !== undefined;
        await context.deferReply({ ephemeral: true });
        await context.editReply({ content: "hello ack", ephemeral: true });
        await context.followUp({ content: "hello follow-up", ephemeral: true, flags: 4 as any });
        called = true;
      }
    }

    await store.set(new Hello());
    const router = new InteractionCommandRouter({ client, rest });
    router.bindGateway(gateway);

    await router.registerGlobalCommands(rest, "123");
    expect(rest.lastRequest?.method).toBe("PUT");
    expect(rest.lastRequest?.path).toBe("/applications/123/commands");

    await gateway.emitInteraction({
      id: "111111111111111111",
      application_id: "123",
      token: "interaction-token",
      guild_id: "999",
      channel_id: "888",
      member: { user: { id: "777", username: "tester" }, roles: [] },
      data: { name: "hello", resolved: { users: { "777": { id: "777", username: "tester" } } } }
    });
    expect(called).toBe(true);
    expect(observedGuildId).toBe("999");
    expect(observedChannelId).toBe("888");
    expect(observedUserId).toBe("777");
    expect(observedMemberPresent).toBe(true);
    expect(observedResolvedPresent).toBe(true);
    expect(rest.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      "PUT /applications/123/commands",
      "POST /interactions/111111111111111111/interaction-token/callback",
      "PATCH /webhooks/123/interaction-token/messages/@original",
      "POST /webhooks/123/interaction-token"
    ]);
    const deferBody = JSON.parse(String(rest.requests[1]?.init?.body));
    const editBody = JSON.parse(String(rest.requests[2]?.init?.body));
    const followBody = JSON.parse(String(rest.requests[3]?.init?.body));
    expect(deferBody.data.flags).toBe(64);
    expect(editBody.flags).toBe(64);
    expect(followBody.flags).toBe(68);
  });

  test("prefix router exposes reply helper from framework", async () => {
    const client = new ChordClient();
    const store = client.createStore<Command>("commands");
    const replies: Array<string | PrefixReplyPayload> = [];

    class Ping extends Command {
      constructor(context?: any) {
        super(context || {} as any, { name: "ping" });
      }
      async run(context: { reply(payload: string | PrefixReplyPayload): Promise<unknown> }): Promise<void> {
        await context.reply({
          content: "pong",
          tts: false,
          embeds: [{ title: "Ping" }],
          allowed_mentions: { parse: [] },
          message_reference: {
            message_id: "123456789012345678",
            channel_id: "987654321098765432"
          },
          flags: 0 as PrefixReplyPayload["flags"]
        });
      }
    }

    await store.set(new Ping());
    const router = new PrefixCommandRouter({
      client,
      prefix: "!",
      reply: async (_message, content) => {
        replies.push(content);
      }
    });

    const handled = await router.handleMessage({ content: "!ping" });
    expect(handled).toBe(true);
    expect(replies).toEqual([
      {
        content: "pong",
        tts: false,
        embeds: [{ title: "Ping" }],
        allowed_mentions: { parse: [] },
        message_reference: {
          message_id: "123456789012345678",
          channel_id: "987654321098765432"
        },
        flags: 0
      }
    ]);
  });

  test("prefix router resolves command aliases", async () => {
    const client = new ChordClient();
    const store = client.createStore<Command>("commands");
    let called = false;

    class Ping extends Command {
      constructor(context?: any) {
        super(context || {} as any, { name: "ping", aliases: ["p", "pong"] });
      }

      run(): void {
        called = true;
      }
    }

    await store.set(new Ping());
    const router = new PrefixCommandRouter({ client, prefix: "!" });
    const handled = await router.handleMessage({ content: "!p" });
    expect(handled).toBe(true);
    expect(called).toBe(true);
  });

  test("prefix router supports mention prefix", async () => {
    const client = new ChordClient();
    const store = client.createStore<Command>("commands");
    let called = false;

    class Ping extends Command {
      constructor(context?: any) {
        super(context || {} as any, { name: "ping" });
      }
      run(): void {
        called = true;
      }
    }

    await store.set(new Ping());
    const router = new PrefixCommandRouter({
      client,
      prefix: "!",
      mentionPrefixIds: ["123456789012345678"]
    });

    const handled = await router.handleMessage({ content: "<@123456789012345678> ping" });
    expect(handled).toBe(true);
    expect(called).toBe(true);
  });

  test("prefix router caches dynamic prefix by guild", async () => {
    const client = new ChordClient();
    const store = client.createStore<Command>("commands");
    let resolverCalls = 0;

    class Ping extends Command {
      constructor(context?: any) {
        super(context || {} as any, { name: "ping" });
      }
      run(): void {}
    }

    await store.set(new Ping());
    const router = new PrefixCommandRouter({
      client,
      prefix: (message) => {
        resolverCalls++;
        return message.guild_id ? "!" : "$";
      }
    });

    await router.handleMessage({ content: "!ping", guild_id: "1" });
    await router.handleMessage({ content: "!ping", guild_id: "1" });
    expect(resolverCalls).toBe(1);
  });

  test("interaction router sends default ephemeral error response", async () => {
    const client = new ChordClient();
    const store = client.createStore<InteractionCommand>("interactions");
    const gateway = new MockGateway();
    const rest = new MockRest();

    class Boom extends InteractionCommand {
      constructor(context?: any) {
        super(context || {} as any, { name: "boom", description: "throws error" });
      }
      async run(): Promise<void> {
        throw new Error("boom");
      }
    }

    await store.set(new Boom());
    const router = new InteractionCommandRouter({ client, rest });
    router.bindGateway(gateway);

    const handled = await router.handleInteraction({
      id: "222222222222222222",
      application_id: "321",
      token: "err-token",
      type: 2,
      data: { name: "boom" }
    } as any);

    expect(handled).toBe(false);
    const last = rest.requests.at(-1);
    expect(last?.method).toBe("POST");
    expect(last?.path).toBe("/interactions/222222222222222222/err-token/callback");
    const body = JSON.parse(String(last?.init?.body));
    expect(body.type).toBe(4);
    expect(body.data.flags).toBe(64);
    expect(body.data.content).toBe("An unexpected error occurred while running this command.");
  });

  test("interaction router parses subcommand and focused option", async () => {
    const client = new ChordClient();
    const store = client.createStore<InteractionCommand>("interactions");
    const gateway = new MockGateway();
    const rest = new MockRest();

    let observedSubcommandGroup: string | undefined;
    let observedSubcommand: string | undefined;
    let observedFocused: { name: string; value: unknown } | undefined;
    let observedQuery: unknown;

    class Search extends InteractionCommand {
      constructor(context?: any) {
        super(context || {} as any, { name: "search", description: "search command" });
      }
      async run(context: InteractionRunContext): Promise<void> {
        observedSubcommandGroup = context.subcommandGroup;
        observedSubcommand = context.subcommand;
        observedFocused = context.focusedOption;
        observedQuery = context.options.query;
      }
    }

    await store.set(new Search());
    const router = new InteractionCommandRouter({ client, rest });
    router.bindGateway(gateway);

    await gateway.emitInteraction({
      id: "333333333333333333",
      application_id: "123",
      token: "search-token",
      data: {
        name: "search",
        options: [
          {
            type: 2,
            name: "docs",
            options: [
              {
                type: 1,
                name: "lookup",
                options: [
                  { type: 3, name: "query", value: "gateway", focused: true }
                ]
              }
            ]
          }
        ]
      }
    });

    expect(observedSubcommandGroup).toBe("docs");
    expect(observedSubcommand).toBe("lookup");
    expect(observedFocused).toEqual({ name: "query", value: "gateway" });
    expect(observedQuery).toBe("gateway");
  });

  test("built-in preconditions guard execution", async () => {
    const client = new ChordClient();
    const store = client.createStore<Command>("commands");
    let ran = false;

    class Guarded extends Command {
      constructor(context?: any) {
        super(context || {} as any, { name: "guarded" });
      }
      run(): void {
        ran = true;
      }
    }

    await store.set(new Guarded());
    const cd = cooldown({ ttlMs: 60_000 });
    const router = new PrefixCommandRouter({
      client,
      prefix: "!",
      preconditions: [
        guildOnly(),
        ownerOnly({ ownerIds: ["1"] }),
        hasPermissions({ required: 0b10 }),
        cd as any
      ]
    });

    const blockedDm = await router.handleMessage({
      content: "!guarded",
      author: { id: "1" } as any,
      member: { permissions: 0b10 } as any
    });
    expect(blockedDm).toBe(false);

    const first = await router.handleMessage({
      content: "!guarded",
      guild_id: "123",
      author: { id: "1" } as any,
      member: { permissions: 0b10 } as any
    });
    expect(first).toBe(true);
    expect(ran).toBe(true);

    ran = false;
    const second = await router.handleMessage({
      content: "!guarded",
      guild_id: "123",
      author: { id: "1" } as any,
      member: { permissions: 0b10 } as any
    });
    expect(second).toBe(false);
    expect(ran).toBe(false);
  });
});

