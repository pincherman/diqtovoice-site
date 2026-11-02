const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');

const root = process.env.SITE_TEST_ROOT || path.resolve(__dirname, '..');
// Compile and execute the real component and its actual local imports.
// Corpus mutation below is test-only; no product source is rewritten.
function loadSite() {
  const cache = new Map();
  function load(name) {
    const file = [name, `${name}.ts`, `${name}.tsx`].find(p => fs.existsSync(p));
    assert.ok(file, `missing site module: ${name}`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) module.exports = JSON.parse(source);
    else {
      const { outputText } = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022, esModuleInterop: true,
      }, fileName: file });
      const localRequire = id => id.startsWith('@/')
        ? load(path.join(root, id.slice(2))) : require(id);
      vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`,
        { filename: file })(localRequire, module, module.exports);
    }
    return module.exports;
  }
  return load;
}

const payloads = {
  closing: '</script><script>globalThis.__jsonProbe=1</script>',
  mixed: '</ScRiPt ><img src=/json-probe-missing onerror=globalThis.__jsonProbe=2>',
  comment: '<!--<script>double escaped</script>-->',
  unicode: 'Français 日本語 مرحبا 🌍 & <> " \' \\u003c \u2028 \u2029',
};
const fixtures = [];
for (const locale of ['fr', 'en']) {
  for (const [name, payload] of [['original', null], ...Object.entries(payloads)]) {
    test(`${locale}/${name}: both embedded JSON blocks round-trip without HTML delimiters`, () => {
      const load = loadSite();
      const { homeCopy } = load(path.join(root, 'lib/launch-copy.ts'));
      if (payload !== null) {
        homeCopy[locale].FAQ[0].answer = payload;
        homeCopy[locale].ui.jsonProbe = payload;
      }
      const { NewHome } = load(path.join(root, 'components/pages/NewHome.tsx'));
      const element = NewHome({ locale });
      const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>'
        + renderToStaticMarkup(element) + '</body></html>';
      const scripts = element.props.children.filter(child => child.type === 'script'
        && ['application/json', 'application/ld+json'].includes(child.props.type));
      assert.equal(scripts.length, 2);
      const expected = [load(path.join(root, 'lib/site-seo.ts')).homeSchema(locale), {
        ...homeCopy[locale].motion,
        WALL: load(path.join(root, 'content/home/wall.json')),
        ui: homeCopy[locale].ui,
      }];
      if (process.env.SITE_JSON_FIXTURE_DIR) {
        const directory = process.env.SITE_JSON_FIXTURE_DIR;
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, `${locale}-${name}.html`), html);
        fixtures.push({ file: `${locale}-${name}.html`, locale, name, expected });
        fs.writeFileSync(path.join(directory, 'expected.json'), JSON.stringify(fixtures));
      }
      scripts.forEach((script, index) => {
        const text = script.props.dangerouslySetInnerHTML.__html;
        assert.deepEqual(JSON.parse(text), expected[index]);
        assert.ok(!text.includes('<'), `${script.props.type} contains a raw <`);
      });
    });
  }
}
