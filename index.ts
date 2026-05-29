import { performance, PerformanceObserver, type PerformanceEntry } from 'node:perf_hooks';
import * as nodeModule from 'node:module';
import { appendFileSync, writeFileSync } from 'node:fs';

// Where the folded stacks are written. Override with the DEPS_OUT_FILE env var.
const outputFile = process.env.DEPS_OUT_FILE;

if (outputFile) {
  // Start each run with an empty file so output from a previous run is cleared.
  writeFileSync(outputFile, '');
}

const log = (data: string) => {
  if (outputFile) {
    appendFileSync(outputFile, data)
  } else {
    console.log(data)
  }
}

// The chain of module specifiers currently being require()'d, outermost first.
// Each require() pushes its specifier on the way in and pops it on the way out,
// so at any instant this is the live import stack leading to the module that is
// loading right now.
const importStack: string[] = [];

// A 'function' performance entry exposes the timed call's arguments on `detail`.
interface RequireTimingEntry extends PerformanceEntry {
  detail?: unknown[];
}

// Recover the import-stack snapshot we passed into the timed call. It is the
// second argument, so it lands at detail[1] (see `timedRequire` below).
function readImportStack(entry: RequireTimingEntry): unknown[] {
  const snapshot = entry.detail?.[1];
  return Array.isArray(snapshot) ? snapshot : [];
}

// Drain timing entries and append one folded-stack line per measured require()
// to the output file.
const observer = new PerformanceObserver((list) => {
  let batch = '';
  for (const entry of list.getEntries() as RequireTimingEntry[]) {
    const foldedStack = readImportStack(entry).join(';');
    const loadTimeMs = Math.round(entry.duration);

    // Emit "a;b;c <ms>" — the folded-stack format flame-graph tools consume.
    // Skip zero-cost loads to keep the graph readable.
    if (foldedStack && loadTimeMs > 0) {
      batch += `${foldedStack} ${loadTimeMs}\n`;
    }
  }
  if (batch) log(batch);
  performance.clearMarks();
  performance.clearMeasures();
});
observer.observe({ entryTypes: ['function'], buffered: true });

// The unpatched require we ultimately delegate to.
const originalRequire = nodeModule.Module.prototype.require;

// A timed pass-through to the real require. We wrap it with timerify so each
// call produces a performance entry whose `duration` is the load time. The
// import-stack snapshot is passed as the second argument purely so timerify
// records it on the entry's `detail`, where the observer can read it back.
const timedRequire = performance.timerify(
  (_moduleId: string, _importStackSnapshot: string[], requireThis: any, requireArgs: any[]) => {
    return originalRequire.apply(requireThis, requireArgs as [string]);
  },
);

// Patch require so every module load is timed with its import stack attached.
nodeModule.Module.prototype.require = function (this: unknown, ...args: unknown[]) {
  const moduleId = String(args[0]);
  importStack.push(moduleId);
  try {
    return timedRequire(moduleId, [...importStack], this, args);
  } finally {
    importStack.pop();
  }
};