// Node + native ESM ("type": "module"). Run from this folder:
//   node --import ../../register.ts main.js
//   LOADOMETER_OUT_FILE=out.folded node --import ../../register.ts main.js
import './a.js';
const t = Date.now(); while (Date.now() - t < 10) {}
