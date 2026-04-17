import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function generateCommand(type: string, name: string) {
  const normalizedType = type.toLowerCase();
  const dirName = normalizedType === 'command' ? 'commands' : 
                  normalizedType === 'listener' ? 'listeners' : 
                  normalizedType === 'interaction' ? 'interactions' : 
                  normalizedType === 'component' ? 'components' :
                  normalizedType === 'modal' ? 'modals' : null;

  if (!dirName) {
    console.error(chalk.red(`Error: Unknown type '${type}'. Valid types: command, listener, interaction, component, modal`));
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), 'src', dirName);
  const targetPath = path.join(targetDir, `${name.toLowerCase()}.ts`);

  if (fs.existsSync(targetPath)) {
    console.error(chalk.red(`Error: File ${targetPath} already exists.`));
    process.exit(1);
  }

  await fs.ensureDir(targetDir);

  const className = name.charAt(0).toUpperCase() + name.slice(1) + (normalizedType === 'command' ? 'Command' : normalizedType === 'listener' ? 'Listener' : '');
  
  let template = '';

  switch (normalizedType) {
    case 'command':
      template = `import { Command, type PrefixReplyPayload } from '@chord.js/core';

export default class ${className} extends Command {
  constructor() {
    super({
      name: '${name.toLowerCase()}',
      description: '${name} command description'
    });
  }

  async run(context: { args: string[]; reply(payload: string | PrefixReplyPayload): Promise<unknown> }): Promise<void> {
    await context.reply('Hello from ${name} command!');
  }
}
`;
      break;
    case 'listener':
      template = `import { Listener } from '@chord.js/core';

export default class ${className} extends Listener {
  constructor() {
    super({
      event: 'ready' // Change to your desired event
    });
  }

  run(...args: any[]): void {
    console.log('${name} listener executed!');
  }
}
`;
      break;
    default:
      template = `import { ${normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} } from '@chord.js/core';

export default class ${className} extends ${normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} {
  constructor() {
    super({
      name: '${name.toLowerCase()}'
    });
  }
}
`;
  }

  await fs.writeFile(targetPath, template);
  console.log(chalk.green(`\n✅ Generated ${normalizedType}: ${chalk.bold(targetPath)}`));
}
