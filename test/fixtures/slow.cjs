// Burns its own time, then loads slower.cjs (so it nests one level deep).
const t = Date.now();
while (Date.now() - t < 12) {}
require('./slower.cjs');
module.exports = 'slow';
