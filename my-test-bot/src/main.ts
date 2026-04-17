import { ChordClient, PrefixCommandRouter, Command, type PrefixReplyPayload } from "@chordjs/core";
import { GatewayClient } from "@chordjs/gateway";
import { RestClient } from "@chordjs/rest";

class PingCommand extends Command {
  constructor() {
    super({ name: "ping", description: "Ping command" });
  }

  async run(context: { args: string[]; reply(payload: string | PrefixReplyPayload): Promise<unknown> }): Promise<void> {
    const suffix = context.args.length > 0 ? ` ${context.args.join(" ")}` : "";
    await context.reply(`pong${suffix}`);
  }
}

async function main(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("Set DISCORD_TOKEN first.");
    process.exit(1);
  }

  const rest = new RestClient({ token });
  const gateway = new GatewayClient({
    token,
    intents: ["GuildMessages", "MessageContent"]
  });

  // 1. 통합 클라이언트 생성 (rest, gateway 주입)
  const client = new ChordClient({ rest, gateway });

  const commandStore = client.createStore<Command>("commands");
  await commandStore.set(new PingCommand());

  // 2. 고수준 엔터티 API를 활용한 리브릿지 설정
  const prefixRouter = new PrefixCommandRouter({
    client,
    prefix: "!",
    reply: async (message, payload) => {
      const channelId = message.channel_id ?? message.channelId;
      if (!channelId) return;

      // 고수준 Channel 엔터티 가져오기
      const channel = await client.channels.fetch(channelId);
      await channel.send(payload);
    }
  });

  gateway.on("open", () => console.log("Gateway connected. Bot is online."));
  gateway.onDispatch("MESSAGE_CREATE", (message) => {
    if (message.author?.bot) return;
    void prefixRouter.handleMessage(message);
  });

  gateway.connect();
}

void main();

