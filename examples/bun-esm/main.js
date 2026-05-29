// Bun + native ESM ("type": "module"). Run from this folder:
//   bun --preload ../../register.ts main.js
//   LOADOMETER_OUT_FILE=out.folded bun --preload ../../register.ts main.js
import './a.js';
const t = Date.now(); while (Date.now() - t < 10) {}
