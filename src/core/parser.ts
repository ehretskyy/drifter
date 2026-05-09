// pulls anything that looks like a local file path out of markdown prose.
//
// TODO: this is a pragmatic heuristic, not a real parser - it'll false-positive
// on stuff like `lodash/get` in prose, or scoped npm packages like `@scope/pkg/file.js`
// (the bare-path pattern below treats the "@" as a boundary and happily matches
// "scope/pkg/file.js" out of that, like it's a project-relative path). good enough
// for v1, revisit with something smarter if it gets noisy in practice.

export interface PathReference {
  path: string;
  line: number;
}

// three shapes, joined with alternation:
//   1. ./relative/path.ts or ../parent/path.ts
//   2. @/alias/path.tsx     (the common tsconfig "paths" alias convention)
//   3. bare/looking/paths.ts (at least one slash, ends in a real extension)
const PATH_RE = /\.{1,2}\/[\w.\-/]+\.\w+|@\/[\w.\-/]+\.\w+|\b[\w-]+\/[\w.\-/]*\.\w+\b/g;

// strip these out BEFORE running PATH_RE, otherwise "https://cdn.foo.com/img/x.png"
// reads as a perfectly valid looking relative path once you ignore the scheme.
const URL_RE = /https?:\/\/[^\s)"'>]+/g;

// fenced blocks tagged as shell commands are full of flags and args that look
// exactly like paths (-f config.json, --file ./out.log) but aren't references
// to anything in the project - skip scanning inside them entirely.
const FENCE_RE = /^```(\w+)?/;
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh']);

export function extractPathReferences(content: string): PathReference[] {
  const lines = content.split('\n');
  const refs: PathReference[] = [];
  let inShellFence = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const fenceMatch = rawLine.trim().match(FENCE_RE);

    if (fenceMatch) {
      if (inShellFence) {
        inShellFence = false; // this fence marker closes the block we were skipping
      } else {
        const lang = (fenceMatch[1] || '').toLowerCase();
        inShellFence = SHELL_LANGS.has(lang);
      }
      continue; // fence markers themselves are never a path
    }

    if (inShellFence) continue;

    const line = rawLine.replace(URL_RE, '');

    // reset lastIndex since PATH_RE is a shared global regex reused across lines
    PATH_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PATH_RE.exec(line)) !== null) {
      refs.push({ path: match[0], line: i + 1 });
    }
  }

  return refs;
}
