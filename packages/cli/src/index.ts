#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { devCommand } from './commands/dev.js';
import { startCommand } from './commands/start.js';
import { buildCommand } from './commands/build.js';
import { addCommand } from './commands/add.js';

const program = new Command();

program
  .name('chord')
  .description('Official CLI for Chord.js framework')
  .version('26.8.9');

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
  .command('add <type> <name>')
  .description('Add a new utility or precondition (precondition, service, middleware)')
  .action((type, name) => addCommand(type, name));

program
  .command('dev')
  .description('Run the bot in development mode with auto-reload')
  .action(() => devCommand());

program
  .command('build')
  .description('Build the project for production')
  .action(() => buildCommand());

program
  .command('start')
  .description('Run the bot in production mode')
  .action(() => startCommand());

program.parse(process.argv);
