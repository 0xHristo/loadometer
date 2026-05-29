// Bun + CommonJS (no "type": "module"). Run from this folder:
//   bun main.js
//   LOADOMETER_OUT_FILE=out.folded bun main.js
require('../../index.ts'); // require() patch captures the loads below
require('./a.js');
