import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDeadLinks } from '../src/core/validator.js';

// tests/ -> repo root, so relative fixture paths line up with what the real
// CLI would resolve from process.cwd() in normal usage
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('only flags the path that does not exist', () => {
  const refs = [
    { path: 'tests/fixtures/real-file.ts', line: 1 },
    { path: 'tests/fixtures/does-not-exist.ts', line: 2 },
  ];

  const deadLinks = findDeadLinks(refs, cwd);

  assert.equal(deadLinks.length, 1);
  assert.equal(deadLinks[0].path, 'tests/fixtures/does-not-exist.ts');
  assert.equal(deadLinks[0].line, 2);
});

test('resolves the @/ alias against cwd root', () => {
  const refs = [{ path: '@/tests/fixtures/real-file.ts', line: 5 }];

  const deadLinks = findDeadLinks(refs, cwd);

  assert.equal(deadLinks.length, 0);
});

test('skips paths that resolve outside cwd instead of reporting a false positive', () => {
  const refs = [{ path: '../../way/outside/project.ts', line: 9 }];

  const deadLinks = findDeadLinks(refs, cwd);

  assert.equal(deadLinks.length, 0);
});
