# loadometer

See where your app spends time **loading modules**, as a flame graph.

`loadometer` times every module your app loads — `require()` and `import`,
JavaScript and TypeScript — and writes the result as
[folded stacks](https://github.com/brendangregg/FlameGraph#2-fold-stacks)
(`import;chain milliseconds`), the format flame-graph tools understand.

## Install

```sh
npm install --save-dev loadometer
```

## Usage

Run your app with `loadometer` as a **preload** — no code changes:

```sh
node --import loadometer/register app.js      # Node
bun  --preload loadometer/register app.js     # Bun
```

This is the recommended way **everywhere**. The preload hooks the module loader
and times each module's load **and** evaluation, covering `require()` and
`import`, in both JavaScript and TypeScript.

## Run it: print to the console

By default the folded stacks are printed to stdout:

```sh
node --import loadometer/register app.js
```

```
./app.js 42
./app.js;express 31
./app.js;express;body-parser 8
```

Each line is an import chain and how many milliseconds that load took.

## Run it: write to a file

Set `LOADOMETER_OUT_FILE` to write the folded stacks to a file instead:

```sh
LOADOMETER_OUT_FILE=imports.folded node --import loadometer/register app.js
```

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

## How it works

`loadometer` measures the **wall-clock time each module takes to load**, then
writes it as folded stacks. It uses two mechanisms, depending on how a module is
loaded:

**CommonJS (`require`).** It wraps `Module.prototype.require` and measures with
`performance.now()` around the original call. Because `require()` synchronously
reads, compiles, *and executes* the module — and everything that module requires
in turn — the time is **inclusive**: a module's number includes its children.

**ESM (`import`), via the preload.** Native imports never call `require`, and a
module's body runs *after* its dependencies are loaded, so there's no single
call to wrap. Instead the loader hooks do two things per module:

1. Time the **load** step — reading the file and transpiling it (e.g. stripping
   TypeScript types).
2. Rewrite the module's source to insert timestamps around its body, timing its
   **evaluation** (the top-level code actually running). The `resolve` step
   records each module's importer, which is how the `a;b;c` import chain is
   rebuilt.

   The reported number is `load + evaluation` for that module.

**What a line means.** Output is one line per module in folded-stack form:

```
express;body-parser;bytes 3
```

reads as "loading `bytes`, imported by `body-parser`, imported by `express`,
took 3 ms." Flame-graph tools size each box by summing its children, turning
these lines into the familiar width-is-time picture.

It's **wall-clock time**, not CPU time, so it includes disk I/O and any waiting
(such as top-level `await`). A module that's already cached loads in ~0 ms — the
work only happens the first time it's pulled in.

## TypeScript

Works out of the box. The preload instruments TypeScript source directly, so it
covers Node's built-in type stripping, `tsx` / `ts-node`, and Bun's native TS —
no separate build step.

## Coverage, and the `require()` workaround

| Runtime | `--import` / `--preload …/register` (recommended) | `require('loadometer')` |
|---------|:-------------------------------------------------:|:-----------------------:|
| Node    | **CommonJS + ESM**                                | CommonJS                |
| Bun     | ESM                                               | CommonJS                |

The preload is the way to go everywhere — with one exception: on **Bun**,
`require()`'d CommonJS dependencies bypass Bun's loader plugin, so the preload
sees only ESM there.

For a **CommonJS app on Bun**, use the in-file import as a workaround — drop this
at the very top of your entry, before anything else (Bun routes `require`
through `Module.prototype.require`, so this captures the loads below it):

```js
require('loadometer'); // must be first
require('./app');
```

## Examples

Runnable examples live in [`examples/`](examples) — quick scripts plus
self-contained repos for every **Node / Bun × CommonJS / ESM** combination. Run
any of them with npm:

```sh
npm run example:node-esm   # Node + native ESM (preload)
npm run example:bun-esm    # Bun  + native ESM (preload)
npm run example:node-cjs   # Node + CommonJS
npm run example:bun-cjs    # Bun  + CommonJS
npm run examples           # all of the above
```

See [`examples/README.md`](examples/README.md) for the full matrix. (Bun scripts
need `bun` on your PATH.)

## Notes

- **What the numbers mean.** The preload times each module's load + its own
  evaluation; the `require('loadometer')` workaround times each load
  *inclusively* (the module and everything it pulls in). Both render fine as a
  flame graph.
