// Same package as main.ts, profiled via the PRELOAD. On Bun this captures ONLY
// this entry — require()'d CommonJS deps bypass Bun's loader plugin:
//   bun --preload ../../register.ts preload.ts
require('./a.ts');
const t: number = Date.now(); while (Date.now() - t < 6) {}
