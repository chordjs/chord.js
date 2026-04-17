import { Command, type PrefixCommandContext } from "@chordjs/framework";

export default class PingCommand extends Command {
  constructor() {
    super({
      name: "ping",
      aliases: ["p", "admin:ping"],
      description: "Replies with pong (folder-loaded command)"
    });
  }

  async run(context: PrefixCommandContext): Promise<void> {
    const suffix = context.args.length > 0 ? ` ${context.args.join(" ")}` : "";
    await context.reply({
      content: `pong${suffix}`
    });
  }
}
