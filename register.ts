// Preload entry: `node --import loadometer/register app.js` (Node) or
// `bun --preload loadometer/register app.js` (Bun).
//
// Two capture mechanisms feed one set of folded stacks:
//   • CommonJS  -> patch Module.prototype.require. require() is called on every
//     load, including cached re-requires and built-ins, in both Node and Bun,
//     so this sees the *whole* require graph. Self-time per frame.
//   • native ESM -> loader hooks (Node registerHooks / Bun.plugin) that time
//     each module's load and rewrite its source to time evaluation. (Loader
//     hooks can't see cached requires or built-ins, which is why CommonJS uses
//     the require patch instead.)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import * as nodeModule from 'node:module';

const out = process.env.LOADOMETER_OUT_FILE;
const totals = new Map<string, number>(); // folded stack -> self ms
const record = (stack: string, ms: number) => {
  if (stack) totals.set(stack, (totals.get(stack) ?? 0) + Math.max(0, ms));
};

// Shorten a file URL or path to a readable frame label. Require specifiers
// (e.g. "parseurl", "./lib/app", "node:http") are kept as written.
const short = (id: string): string => {
  if (!id.startsWith('file:') && !id.startsWith('/')) return id;
  let p = id;
  if (id.startsWith('file:')) {
    try {
      p = fileURLToPath(id);
    } catch {
      return id;
    }
  }
  const i = p.lastIndexOf('node_modules/');
  if (i >= 0) return p.slice(i + 13);
  const cwd = process.cwd();
  return p.startsWith(cwd) ? p.slice(cwd.length).replace(/^[/\\]+/, '') : p;
};

// ---------------------------------------------------------------- CommonJS ---
const cjsStack: string[] = [];
if (process.argv[1]) cjsStack.push(short(process.argv[1])); // root at the entry
const childMs: number[] = [];
const realRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function (this: unknown, ...args: unknown[]) {
  cjsStack.push(String(args[0]));
  const stack = cjsStack.join(';');
  childMs.push(0);
  const start = performance.now();
  try {
    return realRequire.apply(this, args as [string]);
  } finally {
    const inclusive = performance.now() - start;
    const own = childMs.pop()!;
    if (childMs.length) childMs[childMs.length - 1] += inclusive;
    record(stack, inclusive - own); // exclusive self-time
    cjsStack.pop();
  }
};

// -------------------------------------------------------------- native ESM ---
const esmMs = new Map<string, number>(); // url -> ms
const parent = new Map<string, string | undefined>();
const started = new Map<string, number>();
const addEsm = (url: string, ms: number) => esmMs.set(url, (esmMs.get(url) ?? 0) + ms);

// Markers injected into module bodies time their evaluation.
(globalThis as Record<string, unknown>).__LM = {
  enter: (id: string) => started.set(id, performance.now()),
  exit: (id: string) => addEsm(id, performance.now() - started.get(id)!),
};

const instrument = (id: string, source: string) => {
  const tag = JSON.stringify(id);
  const head = `globalThis.__LM.enter(${tag});\n`;
  const tail = `\n;globalThis.__LM.exit(${tag});`;
  let i = 0;
  if (source.startsWith('#!')) {
    const nl = source.indexOf('\n');
    i = nl === -1 ? source.length : nl + 1;
  }
  const directive = /^\s*(['"])use strict\1\s*;?[ \t]*\r?\n?/.exec(source.slice(i));
  if (directive) i += directive[0].length;
  return source.slice(0, i) + head + source.slice(i) + tail;
};

const Bun = (globalThis as Record<string, unknown>).Bun as
  | { plugin: (p: unknown) => void; resolveSync: (s: string, d: string) => string }
  | undefined;

if (Bun) {
  const loader = (p: string) =>
    /\.tsx$/.test(p) ? 'tsx' : /\.ts$/.test(p) ? 'ts' : /\.jsx$/.test(p) ? 'jsx' : 'js';
  Bun.plugin({
    name: 'loadometer',
    setup(build: {
      onResolve: (o: unknown, cb: (a: { path: string; importer: string }) => unknown) => void;
      onLoad: (o: unknown, cb: (a: { path: string }) => unknown) => void;
    }) {
      build.onResolve({ filter: /.*/ }, (args) => {
        try {
          const id = Bun.resolveSync(args.path, args.importer ? dirname(args.importer) : process.cwd());
          if (!parent.has(id)) parent.set(id, args.importer || undefined);
        } catch {
          /* ignore unresolved */
        }
        return undefined;
      });
      build.onLoad({ filter: /\.(m?[jt]sx?|cjs)$/ }, (args) => {
        const t = performance.now();
        const src = readFileSync(args.path, 'utf8');
        addEsm(args.path, performance.now() - t);
        return { contents: instrument(args.path, src), loader: loader(args.path) };
      });
    },
  });
} else {
  nodeModule.registerHooks({
    resolve(spec, ctx, next) {
      const r = next(spec, ctx);
      if (!parent.has(r.url)) parent.set(r.url, ctx.parentURL);
      return r;
    },
    load(url, ctx, next) {
      const t = performance.now();
      const r = next(url, ctx);
      // Native ESM, plus TypeScript-CommonJS (whose require() goes through
      // createRequire and so bypasses the patch above). Plain `commonjs` /
      // undefined is left to the require patch to avoid double-counting.
      if (r.source != null && (r.format?.startsWith('module') || r.format === 'commonjs-typescript')) {
        addEsm(url, performance.now() - t);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = typeof r.source === 'string' ? r.source : new TextDecoder().decode(r.source as any);
        r.source = instrument(url, text);
      }
      return r;
    },
  });
}

// Walk the ESM importer chain into a root-first folded stack.
const esmStack = (id: string) => {
  const names: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = id;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const name = short(cur);
    if (name && name !== '.') names.push(name);
    cur = parent.get(cur);
  }
  return names.reverse().join(';');
};

let flushed = false;
const flush = () => {
  if (flushed) return;
  flushed = true;
  for (const [url, ms] of esmMs) record(esmStack(url), ms); // fold ESM into totals
  let lines = '';
  for (const [stack, ms] of totals) lines += `${stack} ${Math.round(ms)}\n`;
  if (out) writeFileSync(out, lines);
  else if (lines) process.stdout.write(lines);
};

process.on('exit', flush);
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    flush();
    process.exit(0);
  });
}
