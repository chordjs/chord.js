import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

/**
 * 프로젝트의 언어와 모듈 시스템 환경을 감지합니다.
 */
async function detectProjectEnvironment(cwd: string) {
  let language: 'typescript' | 'javascript' = 'javascript';
  let moduleSystem: 'esm' | 'commonjs' = 'commonjs';

  if (await fs.pathExists(path.join(cwd, 'tsconfig.json'))) {
    language = 'typescript';
  }

  const pkgPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      if (pkg.type === 'module') {
        moduleSystem = 'esm';
      }
    } catch {}
  }

  return { language, moduleSystem };
}

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

  const cwd = process.cwd();
  const { language, moduleSystem } = await detectProjectEnvironment(cwd);

  const targetDir = path.resolve(cwd, 'src', dirName);
  const ext = language === 'typescript' ? '.ts' : (moduleSystem === 'commonjs' ? '.cjs' : '.js'); // JS 프로젝트의 경우 package.json type에 따라 .js 사용 (또는 .cjs/.mjs)
  
  // 만약 ESM JS라면 .js(package.json type: module) 또는 .mjs
  // 만약 CJS JS라면 .js(기본값) 또는 .cjs
  const finalExt = language === 'typescript' ? '.ts' : (moduleSystem === 'esm' ? '.js' : '.js'); 
  const targetPath = path.join(targetDir, `${name.toLowerCase()}${finalExt}`);

  if (await fs.pathExists(targetPath)) {
    console.error(chalk.red(`Error: File ${targetPath} already exists.`));
    process.exit(1);
  }

  await fs.ensureDir(targetDir);

  const className = name.charAt(0).toUpperCase() + name.slice(1) + (normalizedType === 'command' ? 'Command' : normalizedType === 'listener' ? 'Listener' : '');
  
  let template = '';

  const isTS = language === 'typescript';
  const isESM = moduleSystem === 'esm';

  // Imports
  if (isESM || isTS) {
    if (normalizedType === 'command') {
      template += `import { Command, EmbedBuilder${isTS ? ', type PrefixCommandContext' : ''} } from '@chordjs/framework';\n\n`;
    } else if (normalizedType === 'interaction') {
      template += `import { Command, SlashCommandBuilder${isTS ? ', type InteractionCommandContext' : ''} } from '@chordjs/framework';\n\n`;
    } else if (normalizedType === 'listener') {
      template += `import { Listener } from '@chordjs/framework';\n\n`;
    } else {
      template += `import { ${normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} } from '@chordjs/framework';\n\n`;
    }
  } else {
    if (normalizedType === 'command') {
      template += `const { Command, EmbedBuilder } = require('@chordjs/framework');\n\n`;
    } else if (normalizedType === 'interaction') {
      template += `const { Command, SlashCommandBuilder } = require('@chordjs/framework');\n\n`;
    } else if (normalizedType === 'listener') {
      template += `const { Listener } = require('@chordjs/framework');\n\n`;
    } else {
      template += `const { ${normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} } = require('@chordjs/framework');\n\n`;
    }
  }

  // Export & Class definition
  if (isESM || isTS) {
    template += `export default class ${className} extends ${normalizedType === 'command' || normalizedType === 'interaction' ? 'Command' : normalizedType === 'listener' ? 'Listener' : normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} {\n`;
  } else {
    template += `class ${className} extends ${normalizedType === 'command' || normalizedType === 'interaction' ? 'Command' : normalizedType === 'listener' ? 'Listener' : normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} {\n`;
  }

  // Constructor
  template += `  constructor() {\n`;
  if (normalizedType === 'interaction') {
    template += `    const builder = new SlashCommandBuilder()\n`;
    template += `      .setName('${name.toLowerCase()}')\n`;
    template += `      .setDescription('${name} interaction description');\n\n`;
    template += `    super({\n`;
    template += `      name: '${name.toLowerCase()}',\n`;
    template += `      description: '${name} interaction description'\n`;
    template += `    });\n`;
    template += `    (this as any).slashBuilder = builder;\n`;
  } else {
    template += `    super({\n`;
    if (normalizedType === 'command') {
      template += `      name: '${name.toLowerCase()}',\n`;
      template += `      description: '${name} command description'\n`;
    } else if (normalizedType === 'listener') {
      template += `      event: 'ready' // Change to your desired event\n`;
    } else {
      template += `      name: '${name.toLowerCase()}'\n`;
    }
    template += `    });\n`;
  }
  template += `  }\n\n`;

  // Run method
  if (normalizedType === 'command') {
    if (isTS) {
      template += `  async run(context: PrefixCommandContext): Promise<void> {\n`;
    } else {
      template += `  async run(context) {\n`;
    }
    template += `    const embed = new EmbedBuilder()\n`;
    template += `      .setTitle('${name} Command')\n`;
    template += `      .setDescription('Successfully executed the ${name} command!')\n`;
    template += `      .setColor(0x5865F2)\n`;
    template += `      .setTimestamp();\n\n`;
    template += `    await context.reply({\n`;
    template += `      embeds: [embed.toJSON()]\n`;
    template += `    });\n`;
    template += `  }\n`;
  } else if (normalizedType === 'interaction') {
    if (isTS) {
      template += `  async run(context: InteractionCommandContext): Promise<void> {\n`;
    } else {
      template += `  async run(context) {\n`;
    }
    template += `    await context.reply({\n`;
    template += `      content: '${name} interaction executed successfully!'\n`;
    template += `    });\n`;
    template += `  }\n`;
  } else if (normalizedType === 'listener') {
    if (isTS) {
      template += `  run(...args: any[]): void {\n`;
    } else {
      template += `  run(...args) {\n`;
    }
    template += `    console.log('${name} listener executed!');\n`;
    template += `  }\n`;
  }

  template += `}\n`;

  if (!isESM && !isTS) {
    template += `\nmodule.exports = ${className};\n`;
  }

  await fs.writeFile(targetPath, template);
  console.log(chalk.green(`\n✅ Generated ${normalizedType} (${language}, ${moduleSystem}): ${chalk.bold(targetPath)}`));
}
