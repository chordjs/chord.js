import { Command, type PrefixReplyPayload } from '@chordjs/core';

export default class HelloCommand extends Command {
  constructor() {
    super({
      name: 'hello',
      description: 'hello command description'
    });
  }

  async run(context: { args: string[]; reply(payload: string | PrefixReplyPayload): Promise<unknown> }): Promise<void> {
    await context.reply('Hello from hello command!');
  }
}
