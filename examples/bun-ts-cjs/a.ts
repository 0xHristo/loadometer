const t: number = Date.now(); while (Date.now() - t < 10) {}
require('./b.ts');
module.exports = 'a';
