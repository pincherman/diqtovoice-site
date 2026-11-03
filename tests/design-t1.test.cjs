const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const postcss = require('postcss');
const { renderToStaticMarkup } = require('react-dom/server');
const root = process.env.SITE_TEST_ROOT || path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function loadSite() {
  const cache = new Map();
  function load(name) {
    const file = [name, `${name}.ts`, `${name}.tsx`].find(p => fs.existsSync(p));
    assert.ok(file, `missing site module: ${name}`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) module.exports = JSON.parse(source);
    else {
      const { outputText } = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022, esModuleInterop: true,
      }, fileName: file });
      const localRequire = id => id.startsWith('@/') ? load(path.join(root, id.slice(2))) : require(id);
      vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename: file })(localRequire, module, module.exports);
    }
    return module.exports;
  }
  return load;
}
const load = loadSite();
const seo = load(path.join(root, 'lib/site-seo.ts'));
const { homeCopy } = load(path.join(root, 'lib/launch-copy.ts'));
const template = read('content/home/template.html');
const css = postcss.parse(read('app/maquette.css'));
function declaration(selector, property, media = '') {
  let value;
  css.walkRules(rule => {
    const parentMedia = rule.parent.type === 'atrule' ? rule.parent.params : '';
    if (parentMedia === media && rule.selectors.includes(selector)) {
      rule.walkDecls(property, decl => { value = decl.value; });
    }
  });
  return value;
}
const expected = {
  fr: {
    heroLink: 'Voir comment ça marche', t025: 'Bientôt sur Windows et Mac, pour Teams, Zoom, Google Meet et Webex.',
    t026: 'Vous parlez français. ', t027: 'On vous comprend de New York à Tokyo.',
    t043: 'Chacun parle sa langue.', t044: '', t048: 'Bientôt disponible.',
    t049: 'Diqto Voice arrive sur Windows et Mac, avec un guide pour chaque application de réunion.',
    t077: 'Ce site ne demande ni adresse e-mail, ni compte, ni carte bancaire.',
    t054: 'Clients, partenaires, filiales :', t055: ' vos réunions avec l’étranger.',
    t056: 'Windows et Mac :', t057: ' un guide pour chaque application.',
    t058: 'Une offre pour les équipes,', t059: ' présentée à l’ouverture.',
    t060: 'Questions fréquentes.', finaleNote: 'Bientôt sur Windows et Mac.',
  },
  en: {
    heroLink: 'See how it works', t025: 'Coming soon to Windows and Mac, for Teams, Zoom, Google Meet and Webex.',
    t026: 'Speak from Paris. ', t027: 'Be understood from New York to Tokyo.',
    t043: 'Everyone speaks their own language.', t044: '', t048: 'Coming soon.',
    t049: 'Diqto Voice is coming to Windows and Mac, with a guide for each meeting app.',
    t077: 'This website asks for no email address, account or bank card.',
    t054: 'Clients, partners, subsidiaries:', t055: ' your meetings across borders.',
    t056: 'Windows and Mac:', t057: ' a guide for each app.',
    t058: 'A plan for teams,', t059: ' presented at launch.',
    t060: 'Frequently asked questions.', finaleNote: 'Coming soon to Windows and Mac.',
  },
};

test('real template removes dead CTAs and veil, preserving menu and pause controls', () => {
  assert.doesNotMatch(template, /<a\b[^>]*class="(?:[^"]* )?btn(?: |")|biz-cta|class="cta"|t050|data-veil|veiled/);
  assert.match(template, /<p class="hero-note"[^>]*>\{\{t025\}\}<\/p>\s*<a class="more" href="#comment">\{\{heroLink\}\}<\/a>/);
  assert.match(template, /<section class="sec" id="comment" aria-labelledby="t-nothing">/);
  assert.match(template, /<p class="finale-note">\{\{finaleNote\}\}<\/p>/);
  assert.match(template, /id="pause"/); assert.match(template, /id="menu-btn"/);
});
for (const locale of ['fr', 'en']) {
  test(`${locale}: exact approved copy is used by the real home renderer`, () => {
    for (const [key, value] of Object.entries(expected[locale])) assert.equal(homeCopy[locale].static[key], value, key);
    const { NewHome } = load(path.join(root, 'components/pages/NewHome.tsx'));
    const rendered = renderToStaticMarkup(NewHome({ locale }));
    assert.ok(rendered.includes(expected[locale].t025));
    assert.ok(rendered.includes(expected[locale].heroLink));
    assert.ok(rendered.includes(expected[locale].finaleNote));
    assert.doesNotMatch(rendered, /\{\{\w+\}\}|biz-cta|data-veil/);
  });
}
test('French home text uses typographic apostrophes; approved hero and slogan remain intact', () => {
  const c = homeCopy.fr;
  assert.ok(!JSON.stringify(c).includes("'"));
  assert.equal(c.static.t020 + c.static.t021 + c.static.t022, 'La barrière de la langue vient de tomber.');
  assert.equal(c.static.t061 + c.static.t062 + c.static.t063, 'Votre voix n’a plus de frontières.');
});
test('Apple tokens, typography and section styles are integrated in active maquette.css', () => {
  for (const [prop, value] of Object.entries({ '--night': '#000000', '--night-2': '#111113', '--night-3': '#1d1d1f', '--ink': '#f5f5f7', '--muted': '#86868b', '--text-2': '#a1a1a6', '--head': '52px', '--font': 'var(--font-text)' })) assert.equal(declaration(':root', prop), value, prop);
  assert.match(declaration(':root', '--font-text'), /-apple-system.*SF Pro Text.*Segoe UI Variable Text/);
  assert.match(declaration(':root', '--font-display'), /SF Pro Display.*Segoe UI Variable Display/);
  for (const selector of ['.hook', '.h2', '.slogan', '.dialog li', '.apps-list', '.word', '.menu nav a']) {
    assert.equal(declaration(selector, 'font-family'), 'var(--font-display)', selector);
    assert.equal(declaration(selector, 'font-weight'), '600', selector);
  }
  for (const [selector, prop, value] of [
    ['body', 'font-size', '17px'], ['body', 'line-height', '1.47'],
    ['.hook em', 'color', 'inherit'], ['.slogan span', 'color', 'inherit'],
    ['.site-head', 'border-bottom', '0'], ['.sec', 'border-top', '0'],
    ['.finale', 'background', '#000'], ['.dialog.armed li.last.lit', 'color', 'var(--ink)'],
    ['.bub.src', 'background', 'var(--green)'], ['.names li', 'border', '0'],
    ['.say.out .word', 'filter', 'none'], ['.btn:hover', 'transform', 'none'],
    ['.btn:active', 'transform', 'scale(.97)'], ['.icon-btn:active', 'transform', 'scale(.92)'],
    ['.hero-cta', 'flex-direction', 'column'], ['.hero-note', 'order', '-1'],
    ['.foot', 'font-size', '12px'], ['.qa summary::after', 'content', '""'],
  ]) assert.equal(declaration(selector, prop), value, `${selector}/${prop}`);
  assert.doesNotMatch(read('app/maquette.css') + read('app/preview.css'), /Work\s?Sans|\.veiled|@font-face/);
  assert.ok(!fs.existsSync(path.join(root, 'public/fonts/WorkSans.ttf')));
});
test('system preferences and content-sized mobile hero remain active', () => {
  assert.equal(declaration('.hero', 'height', '(max-width: 600px)'), 'auto');
  assert.equal(declaration('.hero::after', 'background', '(max-width: 600px)'), 'rgba(0,0,0,.9)');
  assert.equal(declaration('.site-head', 'backdrop-filter', '(prefers-reduced-transparency: reduce)'), 'none');
  assert.equal(declaration('.lang-list', 'backdrop-filter', '(prefers-reduced-transparency: reduce)'), 'none');
  assert.equal(declaration(':root', '--muted', '(prefers-contrast: more)'), '#c7c7cc');
  assert.equal(declaration('*', 'transition', '(prefers-reduced-motion: reduce)'), 'none');
  assert.equal(declaration('*', 'animation', '(prefers-reduced-motion: reduce)'), 'none');
});
test('motion uses the six approved edits, system canvas fonts and no veil or glow', () => {
  const source = read('public/motion/home.js');
  for (const fragment of [
    'mix(C.n3, C.ink, b.flash * 0.85)', 'ctx.strokeStyle = b.flash > 0 ? C.ink : C.n2;',
    'grad.addColorStop(0.8, "rgba(255,255,255,.10)")',
    'ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1.25; ctx.stroke();',
    'halo.addColorStop(0, "rgba(37,211,102,0)")',
    'g.ctx.fillStyle = C.soft; g.ctx.fill();', 'const FONT = css("--font")',
  ]) assert.ok(source.includes(fragment), fragment);
  assert.doesNotMatch(source, /shadowBlur|shadowColor|veiled|data-veil|Work\s?Sans/);
  assert.match(source, /prefers-reduced-motion/);
});
test('WebSite identity is stable in both home graphs and Organization logo is real', () => {
  const websites = ['fr', 'en'].map(locale => seo.homeSchema(locale)['@graph'].filter(n => n['@type'] === 'WebSite'));
  assert.equal(websites[0].length, 1); assert.equal(websites[1].length, 1);
  assert.deepEqual(websites[0][0], websites[1][0]);
  assert.deepEqual(websites[0][0], { '@type': 'WebSite', '@id': 'https://diqtovoice.com/#website', name: 'Diqto Voice', alternateName: ['diqtovoice.com'], url: 'https://diqtovoice.com/', publisher: { '@id': 'https://diqtovoice.com/#organization' } });
  for (const locale of ['fr', 'en']) {
    const graph = seo.homeSchema(locale)['@graph'];
    const org = graph.find(n => n['@type'] === 'Organization');
    assert.equal(org.logo, 'https://diqtovoice.com/favicon.svg');
    assert.match(read('public/favicon.svg'), /<svg/);
    assert.doesNotMatch(JSON.stringify(graph), /"(?:sameAs|offers|price|priceCurrency|numberOfItems|aggregateRating)"/);
  }
});
test('head and sitemap use the same canonical English x-default without a root cycle', () => {
  const entries = load(path.join(root, 'app/sitemap.ts')).default();
  assert.equal(entries.length, 4);
  for (const entry of entries) {
    const match = new URL(entry.url).pathname.match(/^\/(fr|en)\/(privacy\/)?$/);
    assert.ok(match); const [, locale, privacy] = match;
    const page = privacy ? 'privacy' : 'home';
    const metadata = seo.publicMetadata(locale, page);
    assert.equal(metadata.alternates.canonical, entry.url);
    assert.deepEqual(metadata.alternates.languages, entry.alternates.languages);
    assert.equal(entry.alternates.languages['x-default'], `https://diqtovoice.com/en/${privacy || ''}`);
  }
  assert.doesNotMatch(JSON.stringify(entries), /\/legal\//);
});
test('lastmod is an explicit significant-edit date, invariant across repeated builds', () => {
  const sitemap = load(path.join(root, 'app/sitemap.ts')).default;
  const first = sitemap();
  assert.deepEqual(first, sitemap());
  for (const entry of first) assert.equal(entry.lastModified, entry.url.includes('/privacy/') ? '2026-11-02' : '2026-11-03');
  assert.doesNotMatch(read('app/sitemap.ts') + read('lib/site-seo.ts'), /Date\.now\(|new Date\(/);
});
test('robots has no Host; llms is factual and has no model directives', () => {
  const robots = load(path.join(root, 'app/robots.ts')).default();
  assert.equal(robots.host, undefined);
  assert.equal(robots.rules.length, 11);
  assert.doesNotMatch(read('public/llms.txt'), /\b(?:Do not|must|ignore previous|instructions for|you should|you are)\b/i);
  assert.match(read('public/llms.txt'), /Public downloads, purchases and waiting-list sign-ups are not open/);
});
