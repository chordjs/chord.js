import { Command, type PrefixCommandContext, EmbedBuilder } from "@chordjs/framework";

export default class InfoCommand extends Command {
  constructor() {
    super({
      name: "info",
      description: "Shows bot information (folder-loaded command)"
    });
  }

  async run(context: PrefixCommandContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Chord.js Bot Info")
      .setDescription("This is a premium information embed built with EmbedBuilder.")
      .setColor(0x00ff00)
      .addFields(
        { name: "Platform", value: process.platform, inline: true },
        { name: "Node Version", value: process.version, inline: true }
      )
      .setTimestamp();

    await context.reply({
      content: "Here is the info you requested:",
      embeds: [embed.toJSON()]
    });
  }
}
