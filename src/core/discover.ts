// finds the AI context files worth scanning. no config file for this yet -
// just a fixed priority list of the filenames everyone actually uses.
import fs from 'fs';
import path from 'path';

// order matters a little for display purposes but not for correctness -
// we scan all of these, not just the first match.
const CONTEXT_FILENAMES = ['.cursorrules', 'CLAUDE.md', 'AGENTS.md', '.windsurfrules', '.clinerules'];

const CURSOR_RULES_DIR = path.join('.cursor', 'rules');

export function discoverContextFiles(cwd: string): string[] {
  const found: string[] = [];

  for (const name of CONTEXT_FILENAMES) {
    const full = path.join(cwd, name);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      found.push(full);
    }
  }

  const rulesDir = path.join(cwd, CURSOR_RULES_DIR);
  if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
    // .cursor/rules is flat in practice, not bothering with recursion here
    for (const entry of fs.readdirSync(rulesDir)) {
      if (entry.endsWith('.mdc')) {
        found.push(path.join(rulesDir, entry));
      }
    }
  }

  return found;
}
