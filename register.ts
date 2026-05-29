// Preload entry for native ESM (`type: module`) projects, where `require` is
// never called. Run it as a preload so the hooks register before your app's
// module graph loads:
//
//     node --import loadometer/register app.js        (Node)
//     bun  --preload loadometer/register app.js        (Bun)
//
// It times each module's load (read + transpile) AND its evaluation, by
// rewriting the source to record timestamps around the module body — the only
// way to observe evaluation, since neither runtime exposes an "evaluate" hook.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import * as nodeModule from 'node:module';

const out = process.env.LOADOMETER_OUT_FILE;
const ms = new Map<string, number>(); // module id -> total ms (load + evaluation)
const parent = new Map<string, string | undefined>(); // module id -> importer id
const started = new Map<string, number>();
const add = (id: string, t: number) => ms.set(id, (ms.get(id) ?? 0) + t);

// Called by the markers injected into each module body (evaluation timing).
(globalThis as Record<string, unknown>).__LM = {
  enter: (id: string) => started.set(id, performance.now()),
  exit: (id: string) => add(id, performance.now() - started.get(id)!),
};

// Wrap a module's source so its evaluation is timed. Inject *after* a leading
// hashbang and any `'use strict'` directive, so neither is demoted.
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
          /* leave unresolved entries out of the tree */
        }
        return undefined; // let Bun resolve normally
      });
      build.onLoad({ filter: /\.(m?[jt]sx?|cjs)$/ }, (args) => {
        const t = performance.now();
        const src = readFileSync(args.path, 'utf8');
        add(args.path, performance.now() - t);
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
      // Instrument both ESM and CommonJS source; skip builtins/JSON (no source).
      if ((r.format === 'module' || r.format === 'commonjs') && r.source != null) {
        add(url, performance.now() - t);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = typeof r.source === 'string' ? r.source : new TextDecoder().decode(r.source as any);
        r.source = instrument(url, text);
      }
      return r;
    },
  });
}

// Shorten an id (file URL or path) to a readable frame label.
const short = (id: string) => {
  let p = id;
  if (id.startsWith('file:')) {
    try {
      p = fileURLToPath(id);
    } catch {
      return id;
    }
  }
  const i = p.lastIndexOf('node_modules/');
  return i >= 0 ? p.slice(i + 13) : p.replace(process.cwd() + '/', '');
};

// Walk the importer chain into a root-first folded stack.
const stack = (id: string) => {
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

process.on('exit', () => {
  let lines = '';
  for (const [id, t] of ms) {
    const s = stack(id);
    if (s) lines += `${s} ${Math.round(t)}\n`;
  }
  if (out) writeFileSync(out, lines);
  else if (lines) process.stdout.write(lines);
});
