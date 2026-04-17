import { InteractionCommand, type CommandContext } from "@chordjs/core";
import { SlashCommandBuilder } from "@chordjs/builders";
import { EmbedBuilder } from "@chordjs/utils";
import { VoiceGatewayClient } from "@chordjs/voice";
import play from "play-dl";
import { FFmpeg, opus } from "prism-media";

export default class PlayCommand extends InteractionCommand {
  public readonly data = new SlashCommandBuilder()
    .setName("play")
    .setDescription("음악을 재생합니다.")
    .addStringOption(opt => 
      opt.setName("query")
         .setDescription("유튜브 제목이나 URL")
         .setRequired(true)
    );

  public async run(ctx: CommandContext) {
    const query = ctx.interaction.options.getString("query", true);
    
    await ctx.interaction.deferReply();

    try {
      // 1. 음악 검색 및 정보 가져오기
      const searchResults = await play.search(query, { limit: 1 });
      if (searchResults.length === 0) {
        return ctx.interaction.editReply({ content: "검색 결과가 없습니다." });
      }
      
      const video = searchResults[0];
      const stream = await play.stream(video.url);

      // 2. 임베드 생성 (v26.4.0 프리셋 사용)
      const embed = new EmbedBuilder()
        .success("음악 재생 시도 중...")
        .setDescription(`[${video.title}](${video.url})`)
        .setThumbnail(video.thumbnails[0].url)
        .setFooter({ text: `요청자: ${ctx.interaction.user.tag}` });

      await ctx.interaction.editReply({ embeds: [embed.toJSON()] });

      // 3. 음성 채널 연결 (프레임워크 내부 로직 예시)
      // 실제 구현 시에는 VoiceConnection 매니저가 이 과정을 캡슐화해야 합니다.
      console.log(`Connecting to voice channel for guild ${ctx.interaction.guildId}`);
      
      /*
      const voiceClient = new VoiceGatewayClient();
      await voiceClient.connect({
         endpoint: "...", // From Voice State Update
         serverId: ctx.interaction.guildId,
         userId: ctx.client.user.id,
         sessionId: "...",
         token: "..."
      });

      // FFmpeg를 이용한 Opus 인코딩
      const transformer = new FFmpeg({
        args: ['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'],
      });
      const opusEncoder = new opus.Encoder({ frameSize: 960, channels: 2, rate: 48000 });

      stream.stream.pipe(transformer).pipe(opusEncoder).on('data', (chunk) => {
        voiceClient.sendOpusFrame(chunk);
      });
      */

    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .error("음악 재생 중 오류가 발생했습니다.")
        .setDescription(String(error));
      
      await ctx.interaction.editReply({ embeds: [errorEmbed.toJSON()] });
    }
  }
}
