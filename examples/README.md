# loadometer examples

## Quick scripts

- [`example-1.cjs`](example-1.cjs) — basic usage, prints folded stacks to the console.
- [`example-2.cjs`](example-2.cjs) — writes to a file and renders a flame graph.

```sh
node examples/example-1.cjs                              # console output
LOADOMETER_OUT_FILE=imports.folded node examples/example-2.cjs # file + flame graph
```

## Runtime × module-system matrix

Four self-contained repos covering the full matrix: **Node / Bun × CommonJS / ESM**.
Each loads a small nested tree (`main → a → b`) that burns a few ms, so you get
real folded stacks. Run from inside each folder.

| Folder     | Runtime | Module system        | Command                                       |
|------------|---------|----------------------|-----------------------------------------------|
| `node-cjs` | Node    | CommonJS             | `node main.js`                                |
| `bun-cjs`  | Bun     | CommonJS             | `bun main.js`                                 |
| `node-esm` | Node    | ESM (`type: module`) | `node --import ../../register.ts main.js`     |
| `bun-esm`  | Bun     | ESM (`type: module`) | `bun --preload ../../register.ts main.js`     |

Prefix any command with `LOADOMETER_OUT_FILE=out.folded` to write to a file
instead of the console.

CommonJS uses the `require()` patch (`../../index.ts`); native ESM uses the preload
(`../../register.ts`). These point at the TypeScript source directly — in a real
project you'd use `require('loadometer')` / `--import loadometer/register`.

> The ESM scenarios print a Node "module type detection" warning when run from
> source (it type-strips `register.ts` under a package.json with no `"type"`).
> It's harmless and doesn't occur with the published package, which ships `.mjs`.

## Run them with npm

From the repo root:

```sh
npm run example:1          # console output
npm run example:2          # writes imports.folded
npm run example:node-cjs
npm run example:bun-cjs
npm run example:node-esm
npm run example:bun-esm
npm run examples           # all of the above
```

(The Bun scripts require `bun` on your PATH.)
