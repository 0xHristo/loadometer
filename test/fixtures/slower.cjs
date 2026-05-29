// Leaf module: burn a few ms so its load is measurable (> 1ms).
const t = Date.now();
while (Date.now() - t < 6) {}
module.exports = 'slower';
