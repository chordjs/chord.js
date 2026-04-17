import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export async function buildCommand() {
  console.log(chalk.cyan('📦 Building Chord.js project...'));

  const entryPoint = path.resolve(process.cwd(), 'src/main.ts');
  const outDir = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(entryPoint)) {
    console.error(chalk.red(`Error: Entry point ${entryPoint} not found.`));
    process.exit(1);
  }

  try {
    // We'll use bun build for high-performance bundling
    const { stdout } = await execa('bun', [
      'build',
      entryPoint,
      '--outdir', outDir,
      '--target', 'node', // Discord bots usually run on Node/Bun environment
      '--minify',
      '--sourcemap'
    ]);

    console.log(stdout);
    console.log(chalk.green(`✅ Build successful! Output in: ${outDir}`));
  } catch (err) {
    console.error(chalk.red('❌ Build failed:'), err);
    process.exit(1);
  }
}
