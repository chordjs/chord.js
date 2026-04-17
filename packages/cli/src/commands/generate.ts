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
                  normalizedType === 'modal' ? 'modals' :
                  normalizedType === 'plugin' ? 'plugins' : null;

  if (!dirName) {
    console.error(chalk.red(`Error: Unknown type '${type}'. Valid types: command, listener, interaction, component, modal, plugin`));
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
      template += `import { Command, EmbedBuilder${isTS ? ', type PrefixCommandContext, type PieceContext' : ''} } from '@chordjs/framework';\n\n`;
    } else if (normalizedType === 'interaction') {
      template += `import { InteractionCommand, SlashCommandBuilder${isTS ? ', type InteractionRunContext, type PieceContext' : ''} } from '@chordjs/framework';\n\n`;
    } else if (normalizedType === 'listener') {
      template += `import { Listener${isTS ? ', type PieceContext' : ''} } from '@chordjs/framework';\n\n`;
    } else if (normalizedType === 'plugin') {
      template += `import { ChordPlugin } from '@chordjs/framework';\nimport path from 'node:path';\n\n`;
    } else {
      template += `import { ${normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} } from '@chordjs/framework';\n\n`;
    }
  } else {
    if (normalizedType === 'command') {
      template += `const { Command, EmbedBuilder } = require('@chordjs/framework');\n\n`;
    } else if (normalizedType === 'interaction') {
      template += `const { InteractionCommand, SlashCommandBuilder } = require('@chordjs/framework');\n\n`;
    } else if (normalizedType === 'listener') {
      template += `const { Listener } = require('@chordjs/framework');\n\n`;
    } else if (normalizedType === 'plugin') {
      template += `const { ChordPlugin } = require('@chordjs/framework');\nconst path = require('node:path');\n\n`;
    } else {
      template += `const { ${normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)} } = require('@chordjs/framework');\n\n`;
    }
  }

  // Plugin has a special template
  if (normalizedType === 'plugin') {
    if (isESM || isTS) {
      template += `export class ${className} extends ChordPlugin {\n`;
    } else {
      template += `class ${className} extends ChordPlugin {\n`;
    }
    template += `  name = '${name.toLowerCase()}';\n`;
    template += `  version = '1.0.0';\n\n`;
    if (isTS) {
      template += `  async onLoad(): Promise<void> {\n`;
    } else {
      template += `  async onLoad() {\n`;
    }
    template += `    // Load plugin-specific commands and listeners\n`;
    template += `    // await this.client.loader.loadCommandsFrom(path.join(import.meta.dirname, 'commands'));\n`;
    template += `    // await this.client.loader.loadListenersFrom(path.join(import.meta.dirname, 'listeners'));\n`;
    template += `    console.log('✅ ${className} loaded!');\n`;
    template += `  }\n\n`;
    if (isTS) {
      template += `  onUnload(): void {\n`;
    } else {
      template += `  onUnload() {\n`;
    }
    template += `    console.log('👋 ${className} unloaded!');\n`;
    template += `  }\n`;
    template += `}\n`;
    if (!isESM && !isTS) {
      template += `\nmodule.exports = { ${className} };\n`;
    }
  } else {
    // Export & Class definition
    const baseClass = normalizedType === 'command' ? 'Command' : 
                      normalizedType === 'interaction' ? 'InteractionCommand' : 
                      normalizedType === 'listener' ? 'Listener' : 
                      normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
    if (isESM || isTS) {
      template += `export default class ${className} extends ${baseClass} {\n`;
    } else {
      template += `class ${className} extends ${baseClass} {\n`;
    }

    // Constructor
    if (isTS) {
      template += `  constructor(context: PieceContext) {\n`;
    } else {
      template += `  constructor(context) {\n`;
    }
    if (normalizedType === 'interaction') {
      template += `    super(context, {\n`;
      template += `      name: '${name.toLowerCase()}',\n`;
      template += `      description: '${name} interaction description'\n`;
      template += `    });\n`;
    } else if (normalizedType === 'command') {
      template += `    super(context, {\n`;
      template += `      name: '${name.toLowerCase()}',\n`;
      template += `      description: '${name} command description'\n`;
      template += `    });\n`;
    } else if (normalizedType === 'listener') {
      template += `    super(context, {\n`;
      template += `      event: 'MESSAGE_CREATE' // Change to your desired event\n`;
      template += `    });\n`;
    } else {
      template += `    super(context, {\n`;
      template += `      name: '${name.toLowerCase()}'\n`;
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
        template += `  async run(context: InteractionRunContext): Promise<void> {\n`;
      } else {
        template += `  async run(context) {\n`;
      }
      template += `    await context.reply({\n`;
      template += `      content: '${name} interaction executed successfully!'\n`;
      template += `    });\n`;
      template += `  }\n`;
    } else if (normalizedType === 'listener') {
      if (isTS) {
        template += `  run(data: any): void {\n`;
      } else {
        template += `  run(data) {\n`;
      }
      template += `    console.log('${name} listener triggered!', data);\n`;
      template += `  }\n`;
    }

    template += `}\n`;

    if (!isESM && !isTS) {
      template += `\nmodule.exports = ${className};\n`;
    }
  }

  await fs.writeFile(targetPath, template);
  console.log(chalk.green(`\n✅ Generated ${normalizedType} (${language}, ${moduleSystem}): ${chalk.bold(targetPath)}`));
}
