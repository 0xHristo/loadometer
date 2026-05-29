import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const register = join(root, 'register.ts');
const fixtures = join(here, 'fixtures');

const hasBun = (() => {
  try {
    execFileSync('bun', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

// Load times vary from run to run, so compare the import stacks only: drop the
// trailing millisecond value from each folded line and sort.
function stacks(folded) {
  return folded
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(0, line.lastIndexOf(' ')))
    .sort();
}

// Run a scenario repo (under examples/) with output redirected to a temp file;
// return the folded text it produced.
function run(cmd, args, scenario) {
  const out = join(mkdtempSync(join(tmpdir(), 'deps-test-')), 'out.folded');
  execFileSync(cmd, args, {
    cwd: join(root, 'examples', scenario),
    env: { ...process.env, LOADOMETER_OUT_FILE: out },
  });
  return readFileSync(out, 'utf8');
}

const cases = [
  { name: 'Node + JS + CommonJS (require patch)', cmd: process.execPath, args: ['main.js'], dir: 'node-js-cjs' },
  {
    name: 'Node + JS + native ESM (register preload)',
    cmd: process.execPath,
    args: ['--no-warnings', '--import', register, 'main.js'],
    dir: 'node-js-esm',
  },
  { name: 'Bun + JS + CommonJS (require patch)', cmd: 'bun', args: ['main.js'], dir: 'bun-js-cjs', bun: true },
  {
    name: 'Bun + JS + native ESM (register preload)',
    cmd: 'bun',
    args: ['--preload', register, 'main.js'],
    dir: 'bun-js-esm',
    bun: true,
  },

  // TypeScript
  { name: 'Node + TS + CommonJS (require patch)', cmd: process.execPath, args: ['--no-warnings', 'main.ts'], dir: 'node-ts-cjs' },
  {
    name: 'Node + TS + native ESM (register preload)',
    cmd: process.execPath,
    args: ['--no-warnings', '--import', register, 'main.ts'],
    dir: 'node-ts-esm',
  },
  { name: 'Bun + TS + CommonJS (require patch)', cmd: 'bun', args: ['main.ts'], dir: 'bun-ts-cjs', bun: true },
  {
    name: 'Bun + TS + native ESM (register preload)',
    cmd: 'bun',
    args: ['--preload', register, 'main.ts'],
    dir: 'bun-ts-esm',
    bun: true,
  },
];

for (const c of cases) {
  test(c.name, { skip: c.bun && !hasBun }, () => {
    const actual = stacks(run(c.cmd, c.args, c.dir));
    const expected = stacks(readFileSync(join(fixtures, `${c.dir}.folded`), 'utf8'));
    assert.deepEqual(actual, expected);
  });
}
