import fs from 'fs';
import path from 'path';
import type { DeadLink } from '../ui/dashboard.js';
import type { PathReference } from './parser.js';

export function findDeadLinks(refs: PathReference[], cwd: string): DeadLink[] {
  const deadLinks: DeadLink[] = [];

  // standard loop here is just easier to debug when paths start getting weird
  // on windows (backslashes, drive letters, etc) than chaining .filter()
  for (const ref of refs) {
    let relativePath = ref.path;

    // @/ is the common tsconfig "paths" alias for "project root" - not universal,
    // but it's by far the most common convention, so we assume it here. if someone's
    // aliasing @/ to src/ instead of root this'll give a false positive on it.
    if (relativePath.startsWith('@/')) {
      relativePath = relativePath.slice(2);
    }

    const resolved = path.resolve(cwd, relativePath);
    const relativeToCwd = path.relative(cwd, resolved);

    // defensive: if the resolved path escapes cwd entirely (absolute system paths
    // like /etc/passwd, or a "../.." chain that walks past the project root), skip
    // it instead of reporting something we can't meaningfully act on. yes, that also
    // means a legit monorepo "../sibling-package/foo.ts" reference never gets
    // checked - known tradeoff, not worth the edge-case handling for v1.
    if (relativeToCwd.startsWith('..')) {
      continue;
    }

    if (!fs.existsSync(resolved)) {
      deadLinks.push({ path: ref.path, line: ref.line });
    }
  }

  return deadLinks;
}
