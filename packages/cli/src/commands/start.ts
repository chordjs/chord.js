import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export async function startCommand() {
  console.log(chalk.blue('🚀 Starting Chord.js in production mode...'));

  // Production entry point is typically dist/index.js or src/main.ts (for bun)
  const entryPoint = path.resolve(process.cwd(), 'src/main.ts');
  
  if (!fs.existsSync(entryPoint)) {
    console.error(chalk.red(`Error: Entry point ${entryPoint} not found.`));
    process.exit(1);
  }

  try {
    const proc = execa('bun', [entryPoint], {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: 'true' }
    });

    await proc;
  } catch (err) {
    console.error(chalk.red('Error running production server:'), err);
  }
}
