import { Command, type PrefixCommandContext } from "@chordjs/core";
import { type APIEmbed } from "@chordjs/types";

export default class InfoCommand extends Command {
  constructor() {
    super({
      name: "info",
      description: "Shows bot information (folder-loaded command)"
    });
  }

  async run(context: PrefixCommandContext): Promise<void> {
    const embed: APIEmbed = {
      title: "Chord.js Bot Info",
      description: "This is a basic information embed.",
      color: 0x00ff00,
      fields: [
        { name: "Platform", value: process.platform, inline: true },
        { name: "Node Version", value: process.version, inline: true }
      ]
    };

    await context.reply({
      content: "Here is the info you requested:",
      embeds: [embed]
    });
  }
}
