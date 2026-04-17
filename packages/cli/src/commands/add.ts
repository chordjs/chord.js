import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function addCommand(type: string, name: string) {
  const normalizedType = type.toLowerCase();
  const dirName = normalizedType === 'precondition' ? 'preconditions' : 
                  normalizedType === 'service' ? 'services' : 
                  normalizedType === 'middleware' ? 'middlewares' : null;

  if (!dirName) {
    console.error(chalk.red(`Error: Unknown type '${type}'. Valid types: precondition, service, middleware`));
    process.exit(1);
  }

  const cwd = process.cwd();
  const targetDir = path.resolve(cwd, 'src', dirName);
  const targetPath = path.join(targetDir, `${name.toLowerCase()}.ts`);

  if (await fs.pathExists(targetPath)) {
    console.error(chalk.red(`Error: File ${targetPath} already exists.`));
    process.exit(1);
  }

  await fs.ensureDir(targetDir);

  const className = name.charAt(0).toUpperCase() + name.slice(1) + (normalizedType === 'precondition' ? 'Precondition' : '');
  
  let template = '';

  if (normalizedType === 'precondition') {
    template = `import { Precondition, type PreconditionResult } from '@chordjs/framework';\n\n`;
    template += `export default class ${className} extends Precondition {\n`;
    template += `  public override run(context: any): PreconditionResult {\n`;
    template += `    // Add your logic here\n`;
    template += `    return this.ok();\n`;
    template += `  }\n`;
    template += `}\n`;
  } else {
    template = `export class ${className} {\n`;
    template += `  constructor() {\n`;
    template += `    // Initialize ${normalizedType}\n`;
    template += `  }\n`;
    template += `}\n`;
  }

  await fs.writeFile(targetPath, template);
  console.log(chalk.green(`\n✅ Added ${normalizedType}: ${chalk.bold(targetPath)}`));
}
