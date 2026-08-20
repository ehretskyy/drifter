# drifter

[![CI](https://github.com/ehretskyy/drifter/actions/workflows/ci.yml/badge.svg)](https://github.com/ehretskyy/drifter/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

Your `AGENTS.md`, `CLAUDE.md`, and `.cursorrules` files rot the same way your code does.
Someone renames a directory, deletes a helper, refactors the auth flow - and six months
later the AI is still confidently telling itself (and you) to go read a file that hasn't
existed since spring. `drifter` catches that drift before it wastes your context window.

It scans your AI context files for two things nobody else checks for in one pass:

- **Dead references** - file paths mentioned in your rules that no longer exist on disk.
- **Token bloat** - the "please make sure to," "it is very important that you" filler
  that creeps into every hand-edited rules file and quietly eats your context budget.

No config file to write, no LLM call, no network request. It's a couple of regexes and
some `fs.existsSync` calls wrapped in a terminal UI that doesn't look like it was left
over from 2004.

## Why this instead of a grep script

- **Actually built for the files people use in 2026.** Auto-discovers `.cursorrules`,
  `CLAUDE.md`, `AGENTS.md`, `.windsurfrules`, `.clinerules`, and `.cursor/rules/*.mdc` -
  not just one hardcoded filename.
- **CI-native from day one.** `--fail-on-drift` gives you a real exit code, `--json`
  gives you a real machine-readable report. This is meant to live in a pre-commit hook
  or a GitHub Action, not just get run once and forgotten.
- **Measures the thing that actually matters: tokens.** Dead-link checking is table
  stakes. Estimating how much of your context window is filler versus signal, and
  showing you the number, is the part that makes this worth running regularly.
- **Zero-bloat dependency footprint.** Three runtime dependencies (`commander`,
  `picocolors`, and Node itself). No bundled AST toolchain, no telemetry, no fifteen
  transitive packages you didn't ask for.
- **A terminal UI that respects your terminal.** Hand-rolled ANSI animation and
  box-drawing, not a heavyweight TUI framework. It degrades gracefully in narrow
  terminals, CI logs, and non-TTY pipes instead of spewing garbled escape codes.

## Install

```bash
npm install -g drifter
```

Or skip the global install and just run it on demand:

```bash
npx drifter run
```

## Usage

Auto-detect and scan whatever context files exist in the current project:

```bash
drifter run
```

Point it at a specific file instead of relying on auto-discovery:

```bash
drifter run --file AGENTS.md
```

Get machine-readable output for scripts and tooling (skips the boot animation):

```bash
drifter run --json
```

Fail the command with a non-zero exit code if any dead paths are found - this is the
one you actually want in CI or a pre-commit hook:

```bash
drifter run --fail-on-drift
```

### Sample output

Running against the fixture in `tests/fixtures/sample-agents.md` (a deliberately
drifted rules file - two dead links, four fluff phrases):

```
drifter: analyzing local context...
┌──────────────────────────────────────────────────────────────┐
│ SCAN RESULTS                                                 │
├──────────────────────────────────────────────────────────────┤
│ files checked  : 1                                           │
│ paths verified : 4                                           │
├──────────────────────────────────────────────────────────────┤
│ DRIFT REPORT                                                 │
│ line 9: tests/fixtures/ghost-file.ts                         │
│ line 13: src/legacy/old-helper.ts                            │
├──────────────────────────────────────────────────────────────┤
│ OPTIMIZATION                                                 │
│ fluff phrases removed : 4                                    │
│ tokens saved (approx) : 21                                   │
└──────────────────────────────────────────────────────────────┘

report an issue at github.com/ehretskyy/drifter
```

In a real terminal, the drift report lines are red and the optimization section is
green. `--json` gives you the same data without any of the color codes or box drawing:

```json
{
  "filesChecked": ["tests/fixtures/sample-agents.md"],
  "pathsVerified": 4,
  "deadLinks": [
    { "path": "tests/fixtures/ghost-file.ts", "line": 9 },
    { "path": "src/legacy/old-helper.ts", "line": 13 }
  ],
  "fluffRemoved": ["please make sure to", "it is very important that you", "always remember to", "don't forget to"],
  "tokensSaved": 21
}
```

## Using it in CI

Add a step to whatever workflow already runs on your PRs:

```yaml
- name: check AI context files for drift
  run: npx drifter run --fail-on-drift
```

Or as a local pre-commit hook (with something like `husky`):

```bash
npx drifter run --fail-on-drift
```

Either way, a stale path reference now fails the same way a broken test does, instead
of quietly sitting in your repo until someone notices the AI is hallucinating a file
path that used to be real.

## How it works

Three small, independent pieces, run in sequence over whatever context files get
discovered:

1. **Parser** (`src/core/parser.ts`) - regex-based extraction of anything that looks
   like a local file path: `./relative.ts`, `../parent.ts`, `@/alias/path.tsx`, and bare
   `src/like/this.ts` references. It skips shell-tagged fenced code blocks and strips
   URLs first so it doesn't flag a CDN link as a broken import.
2. **Validator** (`src/core/validator.ts`) - resolves each extracted path against your
   project root and checks it with `fs.existsSync`. Nothing fancy, no caching, no AST -
   just a loop.
3. **Compressor** (`src/core/compressor.ts`) - strips a known list of conversational
   filler phrases out of the file and estimates the token savings (roughly 1 word ≈
   1.3 tokens - a heuristic, not a real tokenizer).

### Known limitations

This is intentionally a fast, dependency-free heuristic tool, not a full markdown AST
parser or a language server. That trade-off means a few honest false positives:

- Scoped npm package specifiers in prose (`@scope/pkg/file.js`) can get flagged as a
  broken local path, since the pattern that catches `@/alias/path.ts` also catches
  the shape of a scoped package once you drop the leading `@`.
- References that walk outside your project root (`../../sibling-package/foo.ts`) are
  skipped rather than validated, to avoid false positives on paths drifter has no
  business judging.
- The `@/` alias is assumed to mean "project root," which matches the common
  `tsconfig.json` `paths` convention but won't be correct for every setup.

If any of these bite you in practice, open an issue - the regex and the alias
assumption are both easy to make configurable later, they're just not worth the
complexity until someone actually needs it.

## Development

```bash
git clone https://github.com/ehretskyy/drifter.git
cd drifter
npm install
npm run build
npm test
```

`npm run dev` runs the CLI straight from TypeScript via `tsx`, no build step needed
while you're iterating.

## Contributing

Issues and pull requests are welcome. Keep the dependency list short and the terminal
output emoji-free - that's not a style preference, it's the whole point.

## License

MIT - see [LICENSE](LICENSE).

---

report an issue at [github.com/ehretskyy/drifter](https://github.com/ehretskyy/drifter/issues)
