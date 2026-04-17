#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { devCommand } from './commands/dev.js';
import { startCommand } from './commands/start.js';

const program = new Command();

program
  .name('chord')
  .description('Official CLI for Chord.js framework')
  .version('26.0.5');

program
  .command('init [name]')
  .description('Scaffold a new Chord.js project')
  .action((name) => initCommand(name));

program
  .command('generate <type> <name>')
  .alias('g')
  .description('Generate a new piece (command, listener, etc.)')
  .action((type, name) => generateCommand(type, name));

program
  .command('dev')
  .description('Run the bot in development mode with auto-reload')
  .action(() => devCommand());

program
  .command('start')
  .description('Run the bot in production mode')
  .action(() => startCommand());

program.parse(process.argv);
