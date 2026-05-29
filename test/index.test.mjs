import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
// Run the TypeScript source directly (Node strips types); no build step.
const depsSource = join(root, 'index.ts');
const entry = join(here, 'fixtures', 'entry.cjs');
const expectedFile = join(here, 'fixtures', 'expected.folded');

// Load durations vary from run to run, so compare the import stacks only:
// drop the trailing millisecond value from each line and sort.
function stacks(folded) {
  return folded
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(0, line.lastIndexOf(' ')))
    .sort();
}

test('deps output matches the expected folded stacks', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'deps-test-')), 'out.folded');
  execFileSync(process.execPath, [entry], {
    cwd: dirname(out),
    env: { ...process.env, DEPS_DIST: depsSource, DEPS_OUT_FILE: out },
  });

  const actual = stacks(readFileSync(out, 'utf8'));
  const expected = stacks(readFileSync(expectedFile, 'utf8'));
  assert.deepEqual(actual, expected);
});
