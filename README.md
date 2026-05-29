# loadometer

See where your app spends time **loading modules**, as a flame graph.

`loadometer` patches `require()` and times every module that gets loaded. It prints the
result as [folded stacks](https://github.com/brendangregg/FlameGraph#2-fold-stacks)
(`import;chain milliseconds`) — the format flame-graph tools understand.

## Install

```sh
npm install --save-dev loadometer
```

## Usage

Import `loadometer` at the **very top** of your entry file, before anything else.
Everything loaded after that line is timed.

```js
require('loadometer'); // must be first
require('./app');
```

## Run it: print to the console

By default the folded stacks are printed to stdout:

```sh
node app.js
```

```
./app.js 42
./app.js;express 31
./app.js;express;body-parser 8
```

Each line is an import chain and how many milliseconds that load took.

## Run it: write to a file

Set `LOADOMETER_OUT_FILE` to write the folded stacks to a file instead of the console:

```sh
LOADOMETER_OUT_FILE=imports.folded node app.js
```

## Native ESM (`type: module`)

A bare `require('loadometer')` can't see native `import`s — they're loaded before
any of your code runs. For pure-ESM projects, run `loadometer` as a **preload**
instead. It hooks the module loader and times each module's load **and
evaluation**, producing the same folded output:

```sh
node --import loadometer/register app.js      # Node
bun  --preload loadometer/register app.js     # Bun
```

`LOADOMETER_OUT_FILE` works here too.

### One entry for everything (Node)

On **Node**, the preload also captures CommonJS, so `--import loadometer/register`
is a single universal entry — it profiles `require()` *and* `import` with no code
change to your app. (Source rewriting is done safely: a leading `#!` shebang and
`'use strict'` directive are preserved.)

On **Bun**, the preload covers ESM only — `require()`'d CommonJS modules bypass
Bun's loader plugin. For a CommonJS app on Bun, use `require('loadometer')`
instead, which Bun routes through `Module.prototype.require`.

| Runtime | `require('loadometer')` | `--import` / `--preload …/register` |
|---------|:-----------------------:|:-----------------------------------:|
| Node    | CommonJS                | **CommonJS + ESM**                  |
| Bun     | CommonJS                | ESM                                 |

## Visualize it on the web

Open **[speedscope.app](https://www.speedscope.app)** and drag your
`imports.folded` file onto the page — it renders an interactive flame graph,
no install required.

Prefer an SVG? Any folded-stack renderer works:

```sh
npx inferno imports.folded > imports.svg
# or Brendan Gregg's script:
flamegraph.pl imports.folded > imports.svg
```

## Examples

Runnable examples live in [`examples/`](examples) — two quick scripts plus
self-contained repos for every **Node / Bun × CommonJS / ESM** combination. Run
any of them with npm:

```sh
npm run example:1          # console output
npm run example:2          # writes imports.folded
npm run example:node-cjs   # Node + CommonJS
npm run example:bun-cjs    # Bun  + CommonJS
npm run example:node-esm   # Node + native ESM
npm run example:bun-esm    # Bun  + native ESM
npm run examples           # all of the above
```

See [`examples/README.md`](examples/README.md) for the full matrix. (Bun scripts
need `bun` on your PATH.)

## Notes

- **Two ways to run it.** `require('loadometer')` covers CommonJS — including
  `import`s that compile to `require()` (TypeScript/Babel → CommonJS, `ts-node`,
  `tsx`). The `--import` / `--preload loadometer/register` preload covers native
  ESM, and on Node covers CommonJS too (see the table above).
- **What the numbers mean.** The `require` path times each load *inclusively*
  (execution of the module and everything it pulls in). The ESM preload times
  each module's load + its own evaluation. Both render fine as a flame graph.
