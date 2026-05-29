require('node:os');
require('./b.ts');
const t: number = Date.now(); while (Date.now() - t < 8) {}
module.exports = 'a';
