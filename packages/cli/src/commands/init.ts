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

/**
 * Converts TypeScript source code to JavaScript by stripping type annotations.
 */
function convertTsToJs(code: string): string {
  let result = code;
  // Remove `import type { ... } from "..."` statements entirely
  result = result.replace(/^import\s+type\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?\s*$/gm, '');
  // Remove `type` keyword from mixed imports: `import { Foo, type Bar }` -> `import { Foo }`
  result = result.replace(/,\s*type\s+\w+/g, '');
  result = result.replace(/\{\s*type\s+\w+\s*,\s*/g, '{ ');
  // Remove type annotations from parameters: `(param: Type)` -> `(param)`
  result = result.replace(/:\s*\w+(\[\])?\s*(?=[,\)\=\{])/g, '');
  // Remove return type annotations: `): ReturnType {` -> `) {`
  result = result.replace(/\):\s*\w+(<[^>]+>)?\s*\{/g, ') {');
  // Remove generic type parameters: `<T>` 
  result = result.replace(/<\w+(\s+extends\s+\w+)?>/g, '');
  // Remove `as Type` assertions
  result = result.replace(/\s+as\s+\w+/g, '');
  // Clean up empty lines left behind
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

/**
 * Converts ESM import/export syntax to CommonJS require/module.exports.
 */
function convertEsmToCjs(code: string): string {
  let result = code;
  // Convert: import { A, B } from "mod" -> const { A, B } = require("mod")
  result = result.replace(
    /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g,
    'const {$1} = require("$2");'
  );
  // Convert: import X from "mod" -> const X = require("mod")
  result = result.replace(
    /import\s+(\w+)\s+from\s+["']([^"']+)["'];?/g,
    'const $1 = require("$2");'
  );
  // Convert: export default X -> module.exports = X
  result = result.replace(/export\s+default\s+/g, 'module.exports = ');
  // Convert: export { A, B } -> module.exports = { A, B }
  result = result.replace(/export\s+\{([^}]+)\};?/g, 'module.exports = {$1};');
  // Convert: export class/function -> class/function ... module.exports
  result = result.replace(/export\s+(class|function|const|let|var)\s+/g, '$1 ');
  // Replace import.meta.dirname with __dirname
  result = result.replace(/import\.meta\.dirname/g, '__dirname');
  // Replace import.meta.url with __filename
  result = result.replace(/import\.meta\.url/g, '__filename');
  return result;
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

    // Convert TS -> JS if needed
    if (language === 'javascript') {
      content = convertTsToJs(content);
    }

    // Convert ESM -> CJS if needed (only for JS; TypeScript compiler handles this)
    if (moduleSystem === 'commonjs' && language === 'javascript') {
      content = convertEsmToCjs(content);
    }

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
      dev: `bun run --hot src/main.ts`,
      start: `bun run src/main.ts`,
      build: `bun build ./src/main.ts --outdir ./dist --target bun`,
      typecheck: 'tsc --noEmit',
    };
  } else {
    pkg.scripts = {
      dev: `node --watch src/main.${mainExt === 'cjs' ? 'cjs' : 'mjs'}`,
      start: `node src/main.${mainExt === 'cjs' ? 'cjs' : 'mjs'}`,
    };
  }

  pkg.dependencies = {
    '@chordjs/framework': `^${currentVersion}`,
  };

  if (language === 'typescript') {
    pkg.devDependencies = {
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
      outDir: './dist',
      rootDir: './src',
      types: ['node'],
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

  const targetPath = path.resolve(process.cwd(), targetName!);

  if (fs.existsSync(targetPath)) {
    console.error(chalk.red(`Error: Directory ${targetName} already exists.`));
    process.exit(1);
  }

  console.log(chalk.cyan(`\n🚀 Initializing Chord.js project: ${chalk.bold(targetName)}...`));
  console.log(chalk.dim(`   Language: ${language === 'typescript' ? 'TypeScript' : 'JavaScript'}`));
  console.log(chalk.dim(`   Module:   ${moduleSystem === 'esm' ? 'ESM' : 'CommonJS'}\n`));

  const templatePath = path.resolve(decodeURI(new URL('.', import.meta.url).pathname), '../../template');

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
    const currentVersion = '26.2.2';
    const pkgJson = buildPackageJson(targetName!, language, moduleSystem, currentVersion);
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
