import { Command, type InteractionCommandContext, SlashCommandBuilder } from "@chordjs/framework";

export default class EchoCommand extends Command {
  constructor() {
    // Slash command definition using SlashCommandBuilder
    const builder = new SlashCommandBuilder()
      .setName("echo")
      .setDescription("Replies with your input")
      .addStringOption(option => 
        option.setName("input")
          .setDescription("The text to echo back")
          .setRequired(true)
      );

    super({
      name: "echo",
      description: "Replies with your input (Slash Command)",
      // In a real framework, we'd pass the builder here
      // For now, core pieces might need to be updated to support this
    });

    // Mocking registration for this example
    (this as any).slashBuilder = builder;
  }

  async run(context: InteractionCommandContext): Promise<void> {
    const input = (context.interaction.data as any).options?.[0]?.value ?? "No input provided";
    
    await context.reply({
      content: `Echo: ${input}`
    });
  }
}
