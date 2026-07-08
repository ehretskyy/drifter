#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { runCommand } from '../src/commands/run.js';

const REPO_URL = 'github.com/ehretskyy/drifter';

const program = new Command();

program
  .name('drifter')
  .description(
    [
      'drifter - static analysis for AI context files (.cursorrules, CLAUDE.md, AGENTS.md)',
      '',
      `repo: ${pc.underline(REPO_URL)}`,
    ].join('\n')
  )
  .version('0.1.0', '-v, --version', 'print the current version');

program
  .command('run')
  .description('scan the current project for stale context files, broken paths, and compressible fluff')
  .option('-f, --file <path>', 'path to a specific context file (defaults to auto-detecting .cursorrules / CLAUDE.md / AGENTS.md)')
  .option('--json', 'print machine-readable JSON instead of the dashboard (skips the boot animation)')
  .option('--fail-on-drift', 'exit with a non-zero status if any dead paths are found - useful in CI / pre-commit')
  .action(async (opts: { file?: string; json?: boolean; failOnDrift?: boolean }) => {
    await runCommand(opts);
  });

// keep the repo link visible no matter how someone invokes --help
program.addHelpText('after', `\n${pc.dim('report an issue at')} ${pc.underline(REPO_URL)}\n`);

program.parse(process.argv);
