// Node + CommonJS (no "type": "module"). Run from this folder:
//   node main.js
//   LOADOMETER_OUT_FILE=out.folded node main.js
require('../../index.ts'); // require() patch captures the loads below
require('./a.js');
