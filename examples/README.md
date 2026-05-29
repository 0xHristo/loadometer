# loadometer examples

## Quick scripts

- [`example-1.cjs`](example-1.cjs) — basic usage, prints folded stacks to the console.
- [`example-2.cjs`](example-2.cjs) — writes to a file and renders a flame graph.

```sh
node examples/example-1.cjs                              # console output
LOADOMETER_OUT_FILE=imports.folded node examples/example-2.cjs # file + flame graph
```

## Runtime × language × module-system matrix

Eight self-contained repos covering the full matrix: **Node / Bun × JS / TS ×
CommonJS / ESM**. Each loads a small nested tree (`main → a → b`) that burns a
few ms, so you get real folded stacks. Run from inside each folder.

| Folder         | Runtime | Lang | Module system        | Command                                       |
|----------------|---------|------|----------------------|-----------------------------------------------|
| `node-js-cjs`  | Node    | JS   | CommonJS             | `node main.js`                                |
| `bun-js-cjs`   | Bun     | JS   | CommonJS             | `bun main.js`                                 |
| `node-js-esm`  | Node    | JS   | ESM (`type: module`) | `node --import ../../register.ts main.js`     |
| `bun-js-esm`   | Bun     | JS   | ESM (`type: module`) | `bun --preload ../../register.ts main.js`     |
| `node-ts-cjs`  | Node    | TS   | CommonJS             | `node main.ts`                                |
| `bun-ts-cjs`   | Bun     | TS   | CommonJS             | `bun main.ts`                                 |
| `node-ts-esm`  | Node    | TS   | ESM (`type: module`) | `node --import ../../register.ts main.ts`     |
| `bun-ts-esm`   | Bun     | TS   | ESM (`type: module`) | `bun --preload ../../register.ts main.ts`     |

The CommonJS repos also include a **`preload.js` / `preload.ts`** entry (alongside
`main.*`) with no in-file `require('loadometer')` — run it via the preload to
profile a CommonJS app the universal way:

```sh
cd node-js-cjs && node --import ../../register.ts preload.js   # Node only
```

This is the regression case for "the Node preload captures nested `require()`'d
modules, not just the entry." (Bun's preload can't see `require()`'d CommonJS, so
there's no Bun equivalent.)

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
npm run example:node-js-cjs
npm run example:bun-js-cjs
npm run example:node-js-esm
npm run example:bun-js-esm
npm run example:node-ts-cjs
npm run example:bun-ts-cjs
npm run example:node-ts-esm
npm run example:bun-ts-esm
npm run examples           # all of the above
```

(The Bun scripts require `bun` on your PATH.)
