/**
 * Turning the output into a flame graph.
 *
 * Set DEPS_OUT_FILE and deps writes folded stacks there — exactly the input
 * format flame-graph tools consume. Node runs the TypeScript source directly,
 * so there is no build step:
 *
 *     DEPS_OUT_FILE=imports.folded node examples/example-2.cjs
 *
 *     # then render with any folded-stack tool, e.g.
 *     npx inferno imports.folded > imports.svg          # inferno (npm)
 *     flamegraph.pl imports.folded > imports.svg         # Brendan Gregg's script
 *     # ...or drag imports.folded onto https://www.speedscope.app
 *
 * This example loads a couple of heavier packages so the resulting graph has
 * some depth and width worth looking at.
 */

// In a real project: require('deps');
require('../index.ts');

// A small "startup" that pulls in real dependency trees. Each nested require
// extends the import chain, producing folded lines like:
//     tsup;./chunk-VGC3FXLU.js <ms>
require('typescript');
require('tsup');

// Let the buffered observer flush to the file before the process exits.
setTimeout(() => {}, 200);
