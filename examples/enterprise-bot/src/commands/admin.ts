import { InteractionCommand, type InteractionRunContext } from "@chordjs/core";

export default class AdminCommand extends InteractionCommand {
  constructor(context: any) {
    super(context, {
      name: "admin",
      description: "Enterprise administration tools",
      options: [
        {
          type: 1, // Subcommand
          name: "audit",
          description: "View latest audit logs"
        },
        {
          type: 1, // Subcommand
          name: "events",
          description: "List scheduled events"
        },
        {
          type: 1, // Subcommand
          name: "premium",
          description: "Check your premium status"
        }
      ]
    });
  }

  async run(context: InteractionRunContext) {
    const { interaction, subcommand, guildId } = context;
    if (!guildId) return context.reply({ content: "This command must be used in a guild.", ephemeral: true });

    const guild = await context.interaction.client.guilds.fetch(guildId);

    if (subcommand === "audit") {
      const logs = await guild.fetchAuditLogs({ limit: 5 });
      const entries = logs.entries.map(e => `- **${e.actionType}** by <@${e.userId}>`).join("\n");
      return context.reply({
        content: `📋 **Latest Audit Logs:**\n${entries || "No recent logs found."}`,
        ephemeral: true
      });
    }

    if (subcommand === "events") {
      const events = await guild.fetchScheduledEvents();
      const list = events.map(e => `- **${e.name}** (Status: ${e.status})`).join("\n");
      return context.reply({
        content: `🗓 **Scheduled Events:**\n${list || "No events scheduled."}`,
        ephemeral: true
      });
    }

    if (subcommand === "premium") {
      const entitlements = await guild.fetchEntitlements({ user_id: context.user?.id });
      const isActive = entitlements.some(e => e.isActive);
      return context.reply({
        content: isActive 
          ? "✅ You have an active premium subscription!" 
          : "❌ You don't have an active premium subscription.",
        ephemeral: true
      });
    }
  }
}
