import { ChordClient, GatewayClient, RestClient, GatewayIntentBits } from "@chordjs/framework";
import path from "node:path";

/**
 * Chord.js Basic Bot Example
 * 
 * This example demonstrates:
 * 1. Initializing Rest and Gateway clients
 * 2. Using the unified ChordClient
 * 3. Automatically loading commands and listeners using PieceLoader
 * 4. Handling commands with the built-in PrefixCommandRouter
 */

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("❌ DISCORD_TOKEN environment variable is missing!");
    console.log("Please create a .env file based on .env.example and add your bot token.");
    process.exit(1);
  }

  // 1. Initialize core components
  const rest = new RestClient({ token });
  const gateway = new GatewayClient({ 
    token, 
    intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent 
  });

  // 2. Initialize the unified client
  const client = new ChordClient({ rest, gateway });

  // 3. Load pieces (Commands & Listeners) automatically from their respective folders
  console.log("📂 Loading commands and listeners...");
  
  await client.loader.loadCommandsFrom(path.join(import.meta.dirname, "commands"));
  await client.loader.loadListenersFrom(path.join(import.meta.dirname, "listeners"));

  // 4. Setup Command Router (Prefix)
  const router = new PrefixCommandRouter({
    client,
    prefix: "!", // "!"로 시작하는 명령어를 처리
    reply: async (message, payload) => {
      // 메시지 응답 처리를 위한 간단한 REST 호출 (원래는 더 복잡한 로직이 필요)
      const data = typeof payload === "string" ? { content: payload } : payload;
      return rest.post(`/channels/${message.channel_id}/messages`, {
        body: JSON.stringify(data)
      });
    }
  });

  // 메시지 생성 이벤트에 라우터 연결
  gateway.onDispatch("MESSAGE_CREATE", async (message: any) => {
    // 봇 메시지는 무시
    if (message.author?.bot) return;
    await router.handleMessage(message);
  });

  // 5. Connect to Discord
  console.log("🔮 Connecting to Gateway...");
  await gateway.connect();
}

main().catch((err) => {
  console.error("💥 Failed to start the bot:", err);
  process.exit(1);
});
