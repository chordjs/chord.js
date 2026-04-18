import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(CLI_ROOT, '../..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const TEMPLATES_DIR = path.join(CLI_ROOT, 'templates');

const EXCLUDES = ['node_modules', 'dist', '.turbo', 'bun.lockb'];

const filterFunc = (src: string, dest: string) => {
  const basename = path.basename(src);
  return !EXCLUDES.includes(basename);
};

async function copyTemplates() {
  console.log('🧹 Cleaning old templates...');
  await fs.remove(TEMPLATES_DIR);
  await fs.ensureDir(TEMPLATES_DIR);

  const mappings = [
    { src: path.join(EXAMPLES_DIR, 'chord-bot'), dest: path.join(TEMPLATES_DIR, 'starter') },
    { src: path.join(EXAMPLES_DIR, 'sharding'), dest: path.join(TEMPLATES_DIR, 'sharding') },
    { src: path.join(EXAMPLES_DIR, 'shard-cluster'), dest: path.join(TEMPLATES_DIR, 'shard-cluster') }
  ];

  for (const { src, dest } of mappings) {
    console.log(`📦 Copying ${path.basename(src)} -> templates/${path.basename(dest)}`);
    await fs.copy(src, dest, { filter: filterFunc });
  }

  console.log('✅ Templates copied successfully (excluding node_modules and build artifacts).');
}

copyTemplates().catch((err) => {
  console.error('💥 Failed to copy templates:', err);
  process.exit(1);
});
