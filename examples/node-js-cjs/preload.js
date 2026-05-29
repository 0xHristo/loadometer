// Same package as main.js, but profiled via the PRELOAD — note there is no
// require('loadometer') here. Run from this folder:
//   node --no-warnings --import ../../register.ts preload.js
// Exercises the Node preload capturing nested require()'d CommonJS modules.
require('./a.js');
const t = Date.now(); while (Date.now() - t < 6) {}
