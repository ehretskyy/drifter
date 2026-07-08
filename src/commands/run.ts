import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { runLoader } from '../ui/loader.js';
import { renderDashboard, type DashboardData, type DeadLink } from '../ui/dashboard.js';
import { discoverContextFiles } from '../core/discover.js';
import { extractPathReferences } from '../core/parser.js';
import { findDeadLinks } from '../core/validator.js';
import { compressContent } from '../core/compressor.js';

export interface RunOptions {
  file?: string;
  json?: boolean;
  failOnDrift?: boolean;
}

export async function runCommand(opts: RunOptions): Promise<void> {
  const cwd = process.cwd();
  const files = opts.file ? [path.resolve(cwd, opts.file)] : discoverContextFiles(cwd);

  if (files.length === 0) {
    console.error(pc.red('no context files found (looked for .cursorrules, CLAUDE.md, AGENTS.md, .windsurfrules, .clinerules, .cursor/rules/*.mdc)'));
    console.error(pc.dim('pass one explicitly with --file <path> if it lives somewhere else'));
    process.exit(1);
  }

  // only show the animation on the interactive path - --json is for scripts/CI
  // and nobody wants a 1.5s progress bar polluting stdout they're trying to parse
  if (!opts.json) {
    await runLoader();
  }

  const filesChecked: string[] = [];
  const deadLinks: DeadLink[] = [];
  const fluffRemoved: string[] = [];
  let pathsVerified = 0;
  let tokensSaved = 0;

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      // this only happens when --file pointed at something that doesn't exist -
      // discoverContextFiles() already guarantees existence for the auto path
      console.error(pc.red(`file not found: ${filePath}`));
      process.exit(1);
    }

    // pragmatic shortcut: reading synchronously because these files are tiny
    // (a few KB, tops) - async here would just be overhead for no real benefit
    const content = fs.readFileSync(filePath, 'utf8');

    const refs = extractPathReferences(content);
    pathsVerified += refs.length;
    deadLinks.push(...findDeadLinks(refs, cwd));

    const compression = compressContent(content);
    fluffRemoved.push(...compression.fluffRemoved);
    tokensSaved += compression.tokensSaved;

    // normalize to forward slashes for display/JSON - path.relative() returns
    // backslashes on windows and that looks wrong next to every other path in
    // this tool, which all come out of markdown written with forward slashes
    const relative = path.relative(cwd, filePath) || filePath;
    filesChecked.push(relative.split(path.sep).join('/'));
  }

  const data: DashboardData = {
    filesChecked,
    pathsVerified,
    deadLinks,
    fluffRemoved,
    tokensSaved,
  };

  if (opts.json) {
    console.log(JSON.stringify(data));
  } else {
    renderDashboard(data);
  }

  if (opts.failOnDrift && deadLinks.length > 0) {
    process.exit(1);
  }
}
