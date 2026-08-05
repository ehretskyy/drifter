import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compressContent } from '../src/core/compressor.js';

test('strips fluff phrases and reports which ones were found', () => {
  const content = [
    'Please make sure to run the linter before committing.',
    'It is very important that you keep functions small.',
    'Always remember to update the changelog.',
  ].join('\n');

  const result = compressContent(content);

  assert.ok(!/please make sure to/i.test(result.compressed));
  assert.ok(!/it is very important that you/i.test(result.compressed));
  assert.ok(!/always remember to/i.test(result.compressed));
  assert.equal(result.fluffRemoved.length, 3);
});

test('reports a positive token savings when fluff is removed', () => {
  const content = 'Please make sure to write tests. I would like you to also document your code.';
  const result = compressContent(content);

  assert.ok(result.tokensSaved > 0);
});

test('leaves clean content untouched', () => {
  const content = 'Use TypeScript strict mode. Keep functions under 40 lines.';
  const result = compressContent(content);

  assert.equal(result.fluffRemoved.length, 0);
  assert.equal(result.compressed, content);
  assert.equal(result.tokensSaved, 0);
});
