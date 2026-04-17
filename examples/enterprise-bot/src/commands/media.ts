import { InteractionCommand, type InteractionRunContext } from "@chordjs/core";

export default class MediaCommand extends InteractionCommand {
  constructor(context: any) {
    super(context, {
      name: "media",
      description: "Voice and Sticker tools",
      options: [
        {
          type: 1, // Subcommand
          name: "mute",
          description: "Mute a member",
          options: [
            { type: 6, name: "user", description: "The member to mute", required: true }
          ]
        },
        {
          type: 1,
          name: "stickers",
          description: "List guild stickers"
        }
      ]
    });
  }

  async run(context: InteractionRunContext) {
    const { interaction, subcommand, guildId } = context;
    if (!guildId) return context.reply({ content: "Guild only command.", ephemeral: true });

    const guild = await context.interaction.client.guilds.fetch(guildId);

    if (subcommand === "mute") {
      const targetId = context.options.user as string;
      const member = await guild.fetchMember(targetId);
      await member.voice.setMute(true, "Muted via enterprise admin tool");
      return context.reply({ content: `🔇 Muted <@${targetId}>.`, ephemeral: true });
    }

    if (subcommand === "stickers") {
      const stickers = await guild.fetchStickers();
      const list = stickers.map(s => `- **${s.name}**`).join("\n");
      return context.reply({
        content: `✨ **Guild Stickers:**\n${list || "No stickers found."}`,
        ephemeral: true
      });
    }
  }
}
