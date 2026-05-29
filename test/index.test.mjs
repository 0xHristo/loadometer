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

// Each case names a folded fixture under test/fixtures. `dir` is the example
// repo to run in; `fixture` defaults to `dir` but lets one repo have several
// entries (e.g. the require-patch `main.js` vs the preload `preload.js`).
const cases = [
  // CommonJS via the require() patch
  { name: 'Node + JS + CommonJS (require patch)', cmd: process.execPath, args: ['main.js'], dir: 'node-js-cjs' },
  { name: 'Bun + JS + CommonJS (require patch)', cmd: 'bun', args: ['main.js'], dir: 'bun-js-cjs', bun: true },
  { name: 'Node + TS + CommonJS (require patch)', cmd: process.execPath, args: ['--no-warnings', 'main.ts'], dir: 'node-ts-cjs' },
  { name: 'Bun + TS + CommonJS (require patch)', cmd: 'bun', args: ['main.ts'], dir: 'bun-ts-cjs', bun: true },

  // CommonJS via the preload — must capture nested require()'d modules, not just
  // the entry (Node reports format=undefined for nested CJS, which once slipped
  // past the instrumentation guard). Node only: Bun's preload can't see
  // require()'d CommonJS, so there's no bun-*-cjs preload case.
  {
    name: 'Node + JS + CommonJS via preload (nested requires)',
    cmd: process.execPath,
    args: ['--no-warnings', '--import', register, 'preload.js'],
    dir: 'node-js-cjs',
    fixture: 'node-js-cjs-preload',
  },
  {
    name: 'Node + TS + CommonJS via preload (nested requires)',
    cmd: process.execPath,
    args: ['--no-warnings', '--import', register, 'preload.ts'],
    dir: 'node-ts-cjs',
    fixture: 'node-ts-cjs-preload',
  },
  // Documents a Bun limitation: its loader plugin never sees require()'d
  // CommonJS, so the preload captures only the entry, not the nested tree.
  // If a future Bun starts capturing them, these will fail — on purpose.
  {
    name: 'Bun + JS + CommonJS via preload (entry only — Bun limitation)',
    cmd: 'bun',
    args: ['--preload', register, 'preload.js'],
    dir: 'bun-js-cjs',
    fixture: 'bun-js-cjs-preload',
    bun: true,
  },
  {
    name: 'Bun + TS + CommonJS via preload (entry only — Bun limitation)',
    cmd: 'bun',
    args: ['--preload', register, 'preload.ts'],
    dir: 'bun-ts-cjs',
    fixture: 'bun-ts-cjs-preload',
    bun: true,
  },

  // Native ESM via the preload
  {
    name: 'Node + JS + native ESM (register preload)',
    cmd: process.execPath,
    args: ['--no-warnings', '--import', register, 'main.js'],
    dir: 'node-js-esm',
  },
  {
    name: 'Bun + JS + native ESM (register preload)',
    cmd: 'bun',
    args: ['--preload', register, 'main.js'],
    dir: 'bun-js-esm',
    bun: true,
  },
  {
    name: 'Node + TS + native ESM (register preload)',
    cmd: process.execPath,
    args: ['--no-warnings', '--import', register, 'main.ts'],
    dir: 'node-ts-esm',
  },
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
    const expected = stacks(readFileSync(join(fixtures, `${c.fixture ?? c.dir}.folded`), 'utf8'));
    assert.deepEqual(actual, expected);
  });
}
