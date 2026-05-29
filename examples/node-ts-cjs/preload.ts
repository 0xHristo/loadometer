// Same package as main.ts, but profiled via the PRELOAD (no require('loadometer')).
//   node --no-warnings --import ../../register.ts preload.ts
require('./a.ts');
const t: number = Date.now(); while (Date.now() - t < 6) {}
