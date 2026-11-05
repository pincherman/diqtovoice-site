const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { pruneLegalText } = require('../scripts/prune-legal-text.cjs');
const root = path.resolve(__dirname, '..');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(process.env.SITE_TEST_TMP || os.tmpdir(), 'd1-legal-'));
  // Test-owned synthetic data only; never copy the actual notice/address here.
  t.after(() => fs.rmSync(directory, { recursive: true }));
  function put(name, contents = name) {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    return file;
  }
  for (const locale of ['fr', 'en']) put(`${locale}/legal/index.html`, `<p>${locale} synthetic notice</p>`);
  return { directory, put };
}

function inventory(directory) {
  const files = {};
  function visit(current) {
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      if (fs.statSync(full).isDirectory()) visit(full);
      else files[path.relative(directory, full)] = fs.readFileSync(full);
    }
  }
  visit(directory);
  return files;
}

test('removes all legal Next text variants recursively, and nothing else', t => {
  const { directory, put } = fixture(t);
  const removed = [];
  for (const locale of ['fr', 'en']) {
    for (const name of ['index.txt', '__next._full.txt', '__next.!encoded.legal.__PAGE__.txt', 'nested/chunk.txt']) {
      const relative = `${locale}/legal/${name}`;
      put(relative);
      removed.push(relative);
    }
    put(`${locale}/legal/notice.pdf`, 'synthetic retained document');
    put(`${locale}/privacy/index.txt`);
    put(`${locale}/index.txt`);
  }
  put('robots.txt');
  put('llms.txt');
  put('_next/static/chunk.js');
  const before = inventory(directory);
  assert.deepEqual(pruneLegalText(directory).removed, removed.sort());
  const expected = Object.fromEntries(Object.entries(before).filter(([name]) => !removed.includes(name)));
  assert.deepEqual(inventory(directory), expected);
});

test('is idempotent and retains both legal HTML pages', t => {
  const { directory, put } = fixture(t);
  put('fr/legal/index.txt');
  pruneLegalText(directory);
  const before = inventory(directory);
  assert.deepEqual(pruneLegalText(directory), { removed: [], retainedLegalHtml: ['fr/legal/index.html', 'en/legal/index.html'] });
  assert.deepEqual(inventory(directory), before);
});

test('missing EN legal HTML fails before any FR text is removed', t => {
  const { directory, put } = fixture(t);
  const txt = put('fr/legal/index.txt');
  fs.unlinkSync(path.join(directory, 'en/legal/index.html'));
  assert.throws(() => pruneLegalText(directory), /ENOENT/);
  assert.ok(fs.existsSync(txt));
});

test('a directory in place of legal HTML is refused before pruning', t => {
  const { directory, put } = fixture(t);
  const txt = put('fr/legal/index.txt');
  fs.unlinkSync(path.join(directory, 'en/legal/index.html'));
  fs.mkdirSync(path.join(directory, 'en/legal/index.html'));
  assert.throws(() => pruneLegalText(directory), /regular legal HTML/);
  assert.ok(fs.existsSync(txt));
});

test('CLI validates its export target and returns nonzero on an incomplete export', t => {
  const { directory } = fixture(t);
  fs.unlinkSync(path.join(directory, 'en/legal/index.html'));
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/prune-legal-text.cjs'), directory], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Legal text pruning failed/);
});

test('a synthetic symlink member is refused before any deletion (no real link created)', t => {
  const { directory, put } = fixture(t);
  const txt = put('fr/legal/index.txt');
  const target = put('en/legal/rejected.txt');
  const original = fs.lstatSync;
  t.mock.method(fs, 'lstatSync', function(file, ...options) {
    if (file === target) return { isSymbolicLink: () => true };
    return original.call(fs, file, ...options);
  });
  assert.throws(() => pruneLegalText(directory), /Symlink refused/);
  assert.ok(fs.existsSync(txt));
});

test('CLI reports successful pruning using paths only', t => {
  const { directory, put } = fixture(t);
  put('fr/legal/index.txt');
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/prune-legal-text.cjs'), directory], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { removed: ['fr/legal/index.txt'], retainedLegalHtml: ['fr/legal/index.html', 'en/legal/index.html'] });
});

test('standard build always prunes after a successful Next build', () => {
  const { scripts } = require('../package.json');
  assert.equal(scripts.build, 'next build --webpack && node scripts/prune-legal-text.cjs');
});
