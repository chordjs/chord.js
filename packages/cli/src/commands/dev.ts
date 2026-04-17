import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export async function devCommand() {
  console.log(chalk.cyan('🚀 Starting Chord.js in development mode...'));

  const entryPoint = path.resolve(process.cwd(), 'src/main.ts');
  
  if (!fs.existsSync(entryPoint)) {
    console.error(chalk.red(`Error: Entry point ${entryPoint} not found.`));
    process.exit(1);
  }

  try {
    // We'll use bun if available, otherwise fallback to ts-node or similar?
    // Given the environment, bun is preferred.
    const proc = execa('bun', ['--watch', entryPoint], {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: 'true' }
    });

    await proc;
  } catch (err) {
    if ((err as any).signal === 'SIGINT') {
      console.log(chalk.yellow('\nStopping dev server...'));
    } else {
      console.error(chalk.red('Error running dev server:'), err);
    }
  }
}
