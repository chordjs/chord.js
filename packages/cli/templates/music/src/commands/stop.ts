import { InteractionCommand, type CommandContext } from "@chordjs/core";
import { SlashCommandBuilder } from "@chordjs/builders";
import { EmbedBuilder } from "@chordjs/utils";

export default class StopCommand extends InteractionCommand {
  public readonly data = new SlashCommandBuilder()
    .setName("stop")
    .setDescription("음악 재생을 중지하고 채널에서 나갑니다.");

  public async run(ctx: CommandContext) {
    const embed = new EmbedBuilder()
      .warn("재생 중지")
      .setDescription("음악 재생을 중지하고 채널에서 퇴장합니다.");

    await ctx.interaction.reply({ embeds: [embed.toJSON()] });
    
    // Voice connection termination logic here...
  }
}
