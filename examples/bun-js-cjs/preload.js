// Same package as main.js, profiled via the PRELOAD. On Bun this captures ONLY
// this entry — require()'d CommonJS deps bypass Bun's loader plugin:
//   bun --preload ../../register.ts preload.js
require('./a.js');
const t = Date.now(); while (Date.now() - t < 6) {}
