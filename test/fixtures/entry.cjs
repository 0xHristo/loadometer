// Entry the tests run: load the built `deps` module (path via env), then a
// nested module tree, then stay alive briefly so the observer flushes.
require(process.env.DEPS_DIST);
require('./slow.cjs');
setTimeout(() => {}, 150);
