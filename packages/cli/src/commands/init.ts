import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import enquirer from 'enquirer';

const { Prompt } = enquirer as any;

export async function initCommand(projectName?: string) {
  let targetName = projectName;

  if (!targetName) {
    const response = await (enquirer as any).prompt({
      type: 'input',
      name: 'name',
      message: 'What is your project name?',
      initial: 'my-chord-bot'
    });
    targetName = response.name;
  }

  const targetPath = path.resolve(process.cwd(), targetName!);

  if (fs.existsSync(targetPath)) {
    console.error(chalk.red(`Error: Directory ${targetName} already exists.`));
    process.exit(1);
  }

  console.log(chalk.cyan(`\n🚀 Initializing Chord.js project: ${chalk.bold(targetName)}...`));

  // In a real scenario, we might download from a registry or github.
  // For this monorepo context, we'll try to find the example template.
  const templatePath = path.resolve(decodeURI(new URL('.', import.meta.url).pathname), '../../../../examples/basic-bot');
  
  try {
    if (fs.existsSync(templatePath)) {
      await fs.copy(templatePath, targetPath);
      // Remove node_modules and other junk if they exists in template
      await fs.remove(path.join(targetPath, 'node_modules'));
      await fs.remove(path.join(targetPath, 'dist'));
      
      // Update package.json name and dependencies
      const pkgJsonPath = path.join(targetPath, 'package.json');
      const pkgJson = await fs.readJson(pkgJsonPath);
      pkgJson.name = targetName;
      
      // Replace workspace:* with the actual version
      const currentVersion = "0.1.0"; // This should ideally be read from cli's own version
      if (pkgJson.dependencies) {
        for (const [dep, version] of Object.entries(pkgJson.dependencies)) {
          if (version === 'workspace:*') {
            pkgJson.dependencies[dep] = `^${currentVersion}`;
          }
        }
      }
      
      await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });

      console.log(chalk.green(`\n✅ Project created at ${targetPath}`));
      console.log(chalk.yellow('\nNext steps:'));
      console.log(chalk.white(`  cd ${targetName}`));
      console.log(chalk.white(`  bun install`));
      console.log(chalk.white(`  bun run dev`));
    } else {
      console.error(chalk.red('Error: Template not found.'));
    }
  } catch (err) {
    console.error(chalk.red('Error during initialization:'), err);
  }
}
