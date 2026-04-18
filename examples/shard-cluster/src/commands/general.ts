import {
  Command,
  ApplyOptions,
  Subcommand,
  OnComponent,
  Cooldown,
  type PrefixCommandContext
} from "@chordjs/framework";
import type { InteractionRunContext, ComponentContext } from "@chordjs/interactions";

@ApplyOptions({
  name: "general",
  description: "General purpose utility commands.",
  options: [
    {
      type: 1, // SUB_COMMAND
      name: "info",
      description: "Show information about the bot."
    },
    {
      type: 1, // SUB_COMMAND
      name: "ping",
      description: "Check bot latency."
    }
  ]
})
export default class GeneralCommand extends Command {

  @Subcommand("ping")
  @Cooldown(3000) // 3 seconds cooldown
  async ping(context: InteractionRunContext | PrefixCommandContext) {
    const isInteraction = "interaction" in context;
    const shardId = this.context.client.gateway?.shardId ?? 0;
    const shardCount = this.context.client.gateway?.shardCount ?? 1;
    const latency = this.context.client.gateway?.latency ?? 0;

    const content = `🏓 Pong!
- **Latency**: \`${latency}ms\`
- **Shard**: \`${shardId + 1} / ${shardCount}\`
- **Cluster**: \`${process.env.CLUSTER_ID ?? 'N/A'}\``;

    if (isInteraction) {
      await (context as InteractionRunContext).reply({ content });
    } else {
      await (context as PrefixCommandContext).reply(content);
    }
  }

  @Subcommand("info")
  async info(context: InteractionRunContext | PrefixCommandContext) {
    const embed = {
      title: "🤖 Chord Bot Info",
      description: "This bot is built with Chord.js - the future of Discord frameworks.",
      fields: [
        { name: "Framework", value: "Chord.js v26.9.1", inline: true },
        { name: "Language", value: "TypeScript", inline: true }
      ],
      color: 0x5865F2
    };

    const components = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1, // PRIMARY
            label: "Refresh Stats",
            custom_id: "general:refresh_stats"
          }
        ]
      }
    ];

    const payload = { embeds: [embed], components };

    if ("interaction" in context) {
      await (context as InteractionRunContext).reply(payload);
    } else {
      await (context as PrefixCommandContext).reply(payload as any);
    }
  }

  @OnComponent("general:refresh_stats")
  async onRefresh(context: ComponentContext) {
    await context.updateMessage({
      content: "🔄 Stats updated! (Demonstration of component routing)",
      embeds: [],
      components: []
    });
  }
}
