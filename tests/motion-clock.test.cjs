const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

// Execute the actual shared-clock implementation, not a rewritten predicate.
// The first RAF timestamp may precede performance.now() at wake-up.
test('shared scene clock rejects negative time and keeps its frame cap', () => {
  const root = process.env.SITE_TEST_ROOT || path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'public/motion/home.js'), 'utf8');
  const marker = '  /* ---------- 1. Le mur multilingue mélangé';
  assert.equal(source.split(marker).length, 2);
  const times = [];
  const context = {
    document: {
      getElementById: () => ({ textContent: '{}' }),
      documentElement: {}, hidden: false, addEventListener() {},
    },
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    performance: { now: () => 100 },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  };
  vm.createContext(context);
  vm.runInContext(source.slice(0, source.indexOf(marker)) +
    'globalThis.clock = { scenes, loop, wake };})();', context);
  context.clock.scenes.push({ visible: true, finished: false,
    update(dt) { times.push(dt); assert.ok(dt >= 0, `negative scene time: ${dt}`); },
  });
  context.clock.wake();
  context.clock.loop(99);  // First callback predates the wake sample.
  context.clock.loop(1099); // Existing 50 ms cap must remain in effect.
  context.clock.loop(1119); // Ordinary forward time still advances scenes.
  assert.equal(times[0], 0);
  assert.equal(times[1], 0.05);
  assert.ok(Math.abs(times[2] - 0.02) < 1e-12);
});
