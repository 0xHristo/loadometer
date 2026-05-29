const t = Date.now(); while (Date.now() - t < 10) {}
require('./b.js');
module.exports = 'a';
