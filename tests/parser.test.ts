import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPathReferences } from '../src/core/parser.js';

test('extracts dot-relative and parent-relative paths', () => {
  const content = 'check ./utils/format.ts and also ../shared/helpers.ts for details';
  const paths = extractPathReferences(content).map((r) => r.path);

  assert.ok(paths.includes('./utils/format.ts'));
  assert.ok(paths.includes('../shared/helpers.ts'));
});

test('extracts @/ alias paths', () => {
  const content = 'the page lives at @/app/page.tsx, go read it';
  const refs = extractPathReferences(content);

  assert.equal(refs.length, 1);
  assert.equal(refs[0].path, '@/app/page.tsx');
  assert.equal(refs[0].line, 1);
});

test('extracts bare relative-looking paths and tracks line numbers', () => {
  const content = ['line one is just prose', 'src/components/button.tsx is the file we care about'].join('\n');
  const refs = extractPathReferences(content);

  assert.equal(refs.length, 1);
  assert.equal(refs[0].path, 'src/components/button.tsx');
  assert.equal(refs[0].line, 2);
});

test('ignores paths inside shell fenced code blocks', () => {
  const content = [
    '```bash',
    'cp ./build/output.js ./dist/output.js',
    '```',
    'but ./real/reference.ts should still count',
  ].join('\n');
  const paths = extractPathReferences(content).map((r) => r.path);

  assert.ok(!paths.includes('./build/output.js'));
  assert.ok(!paths.includes('./dist/output.js'));
  assert.ok(paths.includes('./real/reference.ts'));
});

test('does not treat js fenced blocks as off-limits, only shell ones', () => {
  const content = ['```js', "import x from './components/x.ts'", '```'].join('\n');
  const paths = extractPathReferences(content).map((r) => r.path);

  assert.ok(paths.includes('./components/x.ts'));
});

test('strips full URLs before matching so they never get flagged as local paths', () => {
  const content = 'see https://example.com/assets/logo.png for the logo';
  const refs = extractPathReferences(content);

  assert.equal(refs.length, 0);
});

// known limitation, documented here rather than silently "fixed" - scoped npm
// package specifiers read enough like a bare local path that the regex below
// flags a chunk of them. see the TODO comment in parser.ts for the reasoning.
test('known false positive: scoped npm package reads like a bare path', () => {
  const content = 'we depend on @scope/pkg/file.js internally';
  const paths = extractPathReferences(content).map((r) => r.path);

  assert.ok(paths.includes('scope/pkg/file.js'));
});
