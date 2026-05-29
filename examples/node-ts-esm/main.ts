// Node + TypeScript + native ESM. Run from this folder:
//   node --no-warnings --import ../../register.ts main.ts
import './a.ts';
const t: number = Date.now(); while (Date.now() - t < 10) {}
