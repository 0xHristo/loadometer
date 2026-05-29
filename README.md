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

Runnable examples are in [`examples/`](examples):

```sh
node examples/example-1.cjs                              # console output
LOADOMETER_OUT_FILE=imports.folded node examples/example-2.cjs # file + flame graph
```

## Notes

- `loadometer` measures `require()` loads. If your `import` statements compile to
  `require()` — TypeScript or Babel targeting CommonJS, `ts-node`, `tsx` — they're
  captured. Pure native ESM (`"type": "module"` with no transpilation) isn't,
  because those imports load before any of your code runs.
