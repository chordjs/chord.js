import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import enquirer from 'enquirer';

type Language = 'typescript' | 'javascript';
type ModuleSystem = 'esm' | 'commonjs';

interface InitOptions {
  name: string;
  language: Language;
  moduleSystem: ModuleSystem;
}

import * as swc from "@swc/core";

/**
 * Transforms TypeScript/ESM code to JavaScript/CommonJS using SWC for high fidelity.
 */
async function transformWithSwc(
  code: string,
  language: Language,
  moduleSystem: ModuleSystem,
  filename: string
): Promise<string> {
  const isTs = filename.endsWith(".ts");

  // If user wants TypeScript + ESM (and it's already TS), no transform needed
  if (language === "typescript" && moduleSystem === "esm" && isTs) {
    return code;
  }

  const options: swc.Options = {
    filename,
    jsc: {
      parser: {
        syntax: isTs ? "typescript" : "ecmascript",
        decorators: true,
        dynamicImport: true,
      },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
      },
      target: "es2022",
    },
    module: {
      type: moduleSystem === "esm" ? "es6" : "commonjs",
    },
    minify: false,
    sourceMaps: false,
  };

  const result = await swc.transform(code, options);
  return result.code;
}

/**
 * Transform template files based on language and module system choices.
 */
async function transformTemplateFiles(
  targetPath: string,
  language: Language,
  moduleSystem: ModuleSystem
): Promise<void> {
  const srcDir = path.join(targetPath, 'src');
  if (!fs.existsSync(srcDir)) return;

  const files = await getAllFiles(srcDir);

  for (const filePath of files) {
    if (!filePath.endsWith('.ts')) continue;

    let content = await fs.readFile(filePath, 'utf-8');

    // Transform code based on selections
    content = await transformWithSwc(content, language, moduleSystem, filePath);

    // Determine new file extension
    const ext = language === 'typescript' ? '.ts' : (moduleSystem === 'commonjs' ? '.cjs' : '.mjs');
    const newPath = filePath.replace(/\.ts$/, ext);

    // Write transformed content
    await fs.writeFile(newPath, content, 'utf-8');

    // Remove original .ts file if extension changed
    if (newPath !== filePath) {
      await fs.remove(filePath);
    }
  }
}

/**
 * Recursively get all files in a directory.
 */
async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Generate the appropriate package.json for the selected options.
 */
function buildPackageJson(
  name: string,
  language: Language,
  moduleSystem: ModuleSystem,
  template: string,
  currentVersion: string
): Record<string, any> {
  const mainExt = language === 'typescript' ? 'ts' : (moduleSystem === 'commonjs' ? 'cjs' : 'mjs');

  const pkg: Record<string, any> = {
    name,
    private: true,
    version: '1.0.0',
  };

  // Set "type" explicitly for both module systems
  pkg.type = moduleSystem === 'esm' ? 'module' : 'commonjs';

  // Scripts vary by language
  if (language === 'typescript') {
    pkg.scripts = {
      dev: 'chord dev',
      start: 'node dist/main.js',
      build: 'chord build',
      typecheck: 'tsc --noEmit',
    };
  } else {
    pkg.scripts = {
      dev: 'chord dev',
      start: `node dist/main.${mainExt === 'cjs' ? 'cjs' : 'mjs'}`,
      build: 'chord build',
    };
  }

  pkg.dependencies = {
    "@chordjs/framework": `^${currentVersion}`,
    "@chordjs/data": `^${currentVersion}`,
    "@chordjs/i18n": `^${currentVersion}`,
    "reflect-metadata": "^0.2.2"
  };

  if (template === 'sharding' || template === 'shard-cluster') {
    pkg.dependencies["@chordjs/gateway"] = `^${currentVersion}`;
  }

  pkg.devDependencies = {
    "@chordjs/cli": `^${currentVersion}`,
  };

  if (language === 'typescript') {
    pkg.devDependencies = {
      ...pkg.devDependencies,
      '@types/node': '25.6.0',
      typescript: '6.0.3',
    };
  }

  return pkg;
}

/**
 * Generate tsconfig.json for TypeScript projects.
 */
function buildTsConfig(moduleSystem: ModuleSystem): Record<string, any> {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: moduleSystem === 'esm' ? 'ESNext' : 'CommonJS',
      moduleResolution: moduleSystem === 'esm' ? 'Bundler' : 'Node',
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      outDir: './dist',
      rootDir: './src',
      types: ['node', 'reflect-metadata'],
    },
    include: ['src'],
  };
}

export async function initCommand(projectName?: string) {
  let targetName = projectName;

  if (!targetName) {
    const response = await (enquirer as any).prompt({
      type: 'input',
      name: 'name',
      message: 'What is your project name?',
      initial: 'my-chord-bot',
    });
    targetName = response.name;
  }

  // Language selection
  const langResponse = await (enquirer as any).prompt({
    type: 'select',
    name: 'language',
    message: 'Which language would you like to use?',
    choices: [
      { name: 'typescript', message: 'TypeScript (recommended)' },
      { name: 'javascript', message: 'JavaScript' },
    ],
  });
  const language: Language = langResponse.language;

  // Module system selection
  const modResponse = await (enquirer as any).prompt({
    type: 'select',
    name: 'moduleSystem',
    message: 'Which module system would you like to use?',
    choices: [
      { name: 'esm', message: 'ESM (import/export) (recommended)' },
      { name: 'commonjs', message: 'CommonJS (require/module.exports)' },
    ],
  });
  const moduleSystem: ModuleSystem = modResponse.moduleSystem;

  // Template selection
  const templateResponse = await (enquirer as any).prompt({
    type: 'select',
    name: 'template',
    message: 'Which template would you like to use?',
    choices: [
      { name: 'starter', message: 'Starter (Single process, recommended for small bots)' },
      { name: 'sharding', message: 'Sharding (Single process, multiple shards)' },
      { name: 'shard-cluster', message: 'Shard Cluster (Multi-process, for large bots)' },
    ],
  });
  const template: string = templateResponse.template;

  const targetPath = path.resolve(process.cwd(), targetName!);

  if (fs.existsSync(targetPath)) {
    console.error(chalk.red(`Error: Directory ${targetName} already exists.`));
    process.exit(1);
  }

  console.log(chalk.cyan(`\n🚀 Initializing Chord.js project: ${chalk.bold(targetName)}...`));
  console.log(chalk.dim(`   Language: ${language === 'typescript' ? 'TypeScript' : 'JavaScript'}`));
  console.log(chalk.dim(`   Module:   ${moduleSystem === 'esm' ? 'ESM' : 'CommonJS'}`));
  console.log(chalk.dim(`   Template: ${template === 'starter' ? 'Starter' : (template === 'sharding' ? 'Sharding' : 'Shard Cluster')}\n`));

  const templatePath = path.resolve(decodeURI(new URL('.', import.meta.url).pathname), `../../templates/${template}`);

  try {
    if (!fs.existsSync(templatePath)) {
      console.error(chalk.red('Error: Template not found.'));
      return;
    }

    // 1. Copy template
    await fs.copy(templatePath, targetPath);
    await fs.remove(path.join(targetPath, 'node_modules'));
    await fs.remove(path.join(targetPath, 'dist'));

    // 2. Transform source files based on selections
    await transformTemplateFiles(targetPath, language, moduleSystem);

    // 3. Generate package.json
    const currentVersion = '26.9.2';
    const pkgJson = buildPackageJson(targetName!, language, moduleSystem, template, currentVersion);

    await fs.writeJson(path.join(targetPath, 'package.json'), pkgJson, { spaces: 2 });

    // 4. Generate or remove tsconfig.json
    if (language === 'typescript') {
      const tsConfig = buildTsConfig(moduleSystem);
      await fs.writeJson(path.join(targetPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
    } else {
      await fs.remove(path.join(targetPath, 'tsconfig.json'));
    }

    // 5. Generate .env.example
    await fs.writeFile(
      path.join(targetPath, '.env.example'),
      '# Discord Bot Token (https://discord.com/developers/applications)\nDISCORD_TOKEN=your_bot_token_here\n',
      'utf-8'
    );

    console.log(chalk.green(`✅ Project created at ${targetPath}`));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.white(`  cd ${targetName}`));
    console.log(chalk.white(`  cp .env.example .env   ${chalk.dim('# Add your bot token')}`));
    console.log(chalk.white(`  bun install`));
    console.log(chalk.white(`  bun run dev`));
  } catch (err) {
    console.error(chalk.red('Error during initialization:'), err);
  }
}
