require('node:os');
require('./b.js');
const t = Date.now(); while (Date.now() - t < 8) {}
module.exports = 'a';
