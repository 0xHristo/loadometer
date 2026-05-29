/**
 * Basic usage.
 *
 * Import `deps` at the very top of your entry file, before anything else.
 * It patches require() and, for every module loaded afterward, emits one
 * folded-stack line:
 *
 *     <a>;<b>;<c> <milliseconds>
 *
 * where a;b;c is the import chain and the number is how long that load took.
 *
 * By default the lines are printed to stdout; set DEPS_OUT_FILE to write them
 * to a file instead.
 *
 * Run it from the repo root (Node runs the TypeScript source directly):
 *
 *     node examples/example-1.cjs
 */

// In a real project that installed the package, this is simply:
//     require('loadometer');
require('../index.ts');

// Anything required from here on is timed. Real packages have real load cost,
// so they show up; tiny built-ins load in <1ms and are filtered out.
require('typescript');

// deps reports through a buffered PerformanceObserver, which flushes on the
// next tick — keep the process alive briefly so the lines get written.
setTimeout(() => {}, 100);
