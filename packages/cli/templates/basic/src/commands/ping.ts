import { Command, type PrefixReplyPayload, type PieceContext } from "@chordjs/framework";

export default class PingCommand extends Command {
  constructor(context: PieceContext) {
    super(context, {
      name: "ping",
      description: "봇의 응답 속도를 확인합니다.",
    });
  }

  async run(context: { args: string[]; reply(payload: string | PrefixReplyPayload): Promise<unknown> }): Promise<void> {
    const start = Date.now();
    
    // First reply
    await context.reply("🏓 Pong!");
    
    // In a real scenario, you could calculate latency here
    // const latency = Date.now() - start;
    // await context.reply(`🏓 Pong! (${latency}ms)`);
    
    console.log(`[PingCommand] Responded to ping at ${new Date().toISOString()}`);
  }
}
