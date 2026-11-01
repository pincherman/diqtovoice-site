// Real Chromium/CDP QA of the static export. No packages, no external POSTs.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd(), exported = resolve(root, 'out');
const wall = JSON.parse(await readFile(resolve(root, 'content/home/wall.json'), 'utf8'));
const wallFamilies = ['PARDON', 'COMPRENDS', 'REPETER', 'LENTEMENT'];
const scratch = process.env.PREVIEW_SCRATCH, artifacts = process.env.PREVIEW_ARTIFACTS;
const prefix = process.env.PREVIEW_PREFIX || 'reprise';
assert(scratch && artifacts, 'Set existing task-owned scratch and artifact directories');
const profile = resolve(scratch, 'reprise-chromium-profile');
await mkdir(profile, { recursive: true });
const requests = [], blocked = [], exceptions = [], results = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.xml': 'application/xml' };
const server = createServer(async (req, res) => {
  requests.push({ method: req.method, path: req.url });
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  let path = resolve(exported, `.${decodeURIComponent(url.pathname)}`);
  if (path !== exported && !path.startsWith(exported + sep)) { res.writeHead(403).end(); return; }
  if (!extname(path)) path = resolve(path, 'index.html');
  try { const data = await readFile(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }).end(data); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const log = await open(resolve(scratch, 'reprise-chromium.log'), 'a');
const chrome = spawn(process.env.CHROMIUM_BIN || '/snap/bin/chromium', [
  '--headless=new', '--disable-gpu', '--disable-background-networking',
  '--disable-component-update', '--disable-sync', '--disable-extensions', '--no-first-run',
  '--no-default-browser-check', '--password-store=basic', '--metrics-recording-only',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', log.fd, log.fd] });
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', ({ data }) => { const m = JSON.parse(data);
      if (m.id) { const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      else for (const handler of this.handlers.get(m.method) || []) handler(m.params);
    }); }
  on(name, handler) { this.handlers.set(name, [...this.handlers.get(name) || [], handler]); }
  send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.id;
    const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 15000);
    this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
}
let cdp;
const until = async (fn, label, timeout = 12000) => { const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await fn(); if (value) return value; await delay(80); }
  throw Error(`Timed out: ${label}`); };
const expression = async code => { const r = await cdp.send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const check = (name, detail) => { results.push({ name, detail }); console.log(`PASS ${name} ${JSON.stringify(detail)}`); };
const viewport = width => cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
const reduce = value => cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: value ? 'reduce' : 'no-preference' }] });
const navigate = async (path, ready = true) => { await cdp.send('Page.navigate', { url: origin + path });
  await until(() => expression(`location.pathname===${JSON.stringify(path)} && document.readyState==='complete' ${ready ? "&& document.documentElement.classList.contains('motion-ready')" : ''}`), `loaded ${path}`);
  await expression('document.fonts.ready.then(()=>true)'); await delay(250); };
const screenshot = async name => { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  await writeFile(resolve(artifacts, `${prefix}-${name}.png`), Buffer.from(data, 'base64')); };
const scroll = selector => expression(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
const snapshot = () => expression('JSON.stringify({ticks:__motionProbe.ticks,draws:__motionProbe.draws,word:document.querySelector(".say .word")?.textContent,src:document.querySelector(".src")?.textContent,dst:document.querySelector(".dst")?.textContent})');
try {
  const portFile = resolve(profile, 'DevToolsActivePort');
  const port = await until(async () => { try {
    const candidate = (await readFile(portFile, 'utf8')).split('\n')[0];
    const health = await fetch(`http://127.0.0.1:${candidate}/json/version`);
    return health.ok ? candidate : false;
  } catch { return false; } }, 'Chromium launch', 25000);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  cdp = new CDP(ws);
  await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable'].map(m => cdp.send(m)));
  cdp.on('Runtime.exceptionThrown', p => exceptions.push(p.exceptionDetails));
  cdp.on('Fetch.requestPaused', p => {
    const allowed = p.request.url.startsWith(origin + '/') && p.request.method === 'GET';
    if (!allowed) blocked.push({ method: p.request.method, url: p.request.url });
    cdp.send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', allowed ? { requestId: p.requestId } : { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(e => exceptions.push(String(e)));
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__motionProbe={ticks:0,maxPending:0,pending:new Set(),draws:{},wallWords:new Set()};
    const realRAF=requestAnimationFrame,realCancel=cancelAnimationFrame,p=__motionProbe;
    window.requestAnimationFrame=fn=>{let id=realRAF(t=>{p.pending.delete(id);p.ticks++;fn(t)});p.pending.add(id);p.maxPending=Math.max(p.maxPending,p.pending.size);return id};
    window.cancelAnimationFrame=id=>{p.pending.delete(id);realCancel(id)};
    const clear=CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect=function(...a){const key=this.canvas.closest('[data-scene]')?.dataset.scene||'other';p.draws[key]=(p.draws[key]||0)+1;return clear.apply(this,a)};
    const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...a){if(this.canvas.closest('[data-scene]')?.dataset.scene==='wall')p.wallWords.add(text);return fill.call(this,text,...a)};
  ` });
  for (const locale of ['fr', 'en']) for (const width of [375, 768, 1024, 1440]) {
    await viewport(width); await reduce(true); await navigate(`/${locale}/`);
    const sharedWall = await expression('JSON.parse(document.getElementById("home-corpus").textContent).WALL');
    assert.deepEqual(sharedWall, wall, 'Every page must carry the same multilingual wall, not a page-language translation');

    const state = await expression(`({lang:document.documentElement.lang,title:document.title,
      overflow:document.documentElement.scrollWidth>innerWidth,faqs:document.querySelectorAll('.qa details').length,
      apps:[...document.querySelectorAll('.apps-list li')].map(n=>n.textContent),
      forms:document.forms.length,alternates:document.querySelectorAll('link[hreflang]').length,
      canon:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,
      disabled:[...document.querySelectorAll('.btn')].filter(n=>n.textContent.match(/Essayer gratuitement|Try for free/)).every(n=>n.disabled),
      links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),
      missingIds:[...document.querySelectorAll('[aria-describedby],[aria-labelledby]')].flatMap(n=>[n.getAttribute('aria-describedby'),n.getAttribute('aria-labelledby')].filter(Boolean).flatMap(s=>s.split(' '))).filter(id=>!document.getElementById(id)),
      text:document.body.innerText,paused:document.querySelector('#pause').disabled,
      veiled:document.querySelectorAll('.veiled').length,pending:__motionProbe.pending.size})`);
    assert.equal(state.lang, locale); assert.equal(state.overflow, false); assert.equal(state.faqs, 6);
    assert.deepEqual(state.apps, ['Teams', 'Zoom', 'Google Meet', 'Webex']); assert.equal(state.forms, 0);
    assert.equal(state.alternates, 0); assert.equal(state.canon, `https://diqtovoice.com/${locale}/`);
    assert.match(state.robots, /noindex/); assert(state.disabled); assert(state.paused); assert.equal(state.veiled, 0);
    assert.equal(state.pending, 0); assert.deepEqual(state.missingIds, []);
    assert(!state.text.match(/(?:13|12|100|50) (?:langues|languages)|voix clonée|cloned voice|garantie|guarantee|1[,.]5 h|12.month|Palabra|DeepL/i));
    assert(state.links.every(href => href.startsWith('#') || /^\/(fr|en)\/$/.test(href)));
    assert.match(state.text, locale === 'fr' ? /1 heure offerte, sans carte bancaire/ : /1 hour free, no credit card required/);
    assert.match(state.text, locale === 'fr' ? /par e-mail vérifié et installation/ : /per verified email and installation/);
    const fixed = await snapshot(); await delay(400); assert.equal(await snapshot(), fixed, 'Reduced motion must be fixed');
    await screenshot(`${locale}-${width}-reduced`);
    // Reduced motion uses the final, cleared wall. Observe phrases during the native opening instead.
    await reduce(false); await navigate(`/${locale}/`);
    await until(async () => {
      const drawn = await expression('[...__motionProbe.wallWords]');
      return wallFamilies.every(key => wall[key].some(text => drawn.includes(text)));
    }, 'four wall families actually drawn');
    const drawn = await expression('[...__motionProbe.wallWords]');
    assert(drawn.every(text => wallFamilies.some(key => wall[key].includes(text))));
    await screenshot(`${locale}-${width}-mixed-wall`);
    check(`${locale}-${width}-reduced-and-wall`, { overflow: state.overflow, faqs: state.faqs, forms: state.forms, wallFamiliesDrawn: 4, drawnWallPhrases: drawn.length });
  }
  // Native clock: observe motion rather than advancing or fabricating time.
  for (const locale of ['fr', 'en']) {
    await viewport(1440); await reduce(false); await navigate(`/${locale}/`);
    await until(() => expression('!document.querySelector(".hero .veiled") && __motionProbe.pending.size===0'), 'wall completes', 12000);
    await screenshot(`${locale}-wall`);
    await scroll('[data-scene="globe"]'); await delay(1300);
    const first = await snapshot(); await delay(500); assert.notEqual(await snapshot(), first, 'Globe must animate');
    await expression('document.querySelector("#pause").click()'); await delay(120);
    const paused = await snapshot(); await delay(500); assert.equal(await snapshot(), paused, 'Pause must freeze all scenes');
    assert.equal(await expression('__motionProbe.pending.size'), 0);
    assert.match(await expression('document.querySelector("#pause").getAttribute("aria-label")'), locale === 'fr' ? /Reprendre/ : /Resume/);
    await expression('document.querySelector("#pause").click()'); await delay(400); assert.notEqual(await snapshot(), paused);
    await screenshot(`${locale}-globe-motion`);
    await viewport(375); await delay(300);
    assert.equal(await expression('document.documentElement.scrollWidth>innerWidth'), false);
    await screenshot(`${locale}-375-resize`);
    await scroll('footer'); await delay(300);
    const offscreen = await snapshot(); await delay(400); assert.equal(await snapshot(), offscreen, 'Offscreen must sleep');
    assert.equal(await expression('__motionProbe.pending.size'), 0);
    await scroll('[data-scene="hello"]'); await delay(500);
    const hello = await expression('document.querySelector(".say .word").textContent');
    await until(() => expression(`document.querySelector('.say .word').textContent!==${JSON.stringify(hello)}`), 'hello advances', 4000);
    assert.equal(await expression('document.documentElement.scrollWidth>innerWidth'), false);
    await reduce(true); await delay(150);
    const changed = await snapshot(); await delay(400); assert.equal(await snapshot(), changed, 'Dynamic reduced preference must freeze');
    assert.equal(await expression('__motionProbe.pending.size'), 0);
    assert.equal(await expression('__motionProbe.maxPending'), 1, 'Only one animation loop');
    check(`${locale}-motion`, { pause: true, resume: true, offscreen: true, dynamicReduce: true, resize: 375, maxPending: 1 });
  }
  await viewport(1440); await reduce(true); await navigate('/fr/');
  // Export the actual fixed globe for the no-JS fallback; no invented drawing.
  if (process.env.EXPORT_GLOBE_STILL === '1') {
    const png = await expression('document.querySelector("[data-scene=globe] canvas").toDataURL("image/png").split(",")[1]');
    await writeFile(resolve(root, 'public/motion/globe-still.png'), Buffer.from(png, 'base64'));
  }
  await viewport(375); await reduce(false); await navigate('/fr/');
  await expression('document.querySelector("#menu-btn").click()');
  assert.equal(await expression('document.querySelector("#menu-btn").getAttribute("aria-expanded")'), 'true');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  assert.equal(await expression('document.querySelector("#menu").hidden'), true);
  await viewport(1024); await delay(250); assert.equal(await expression('document.querySelector("#menu").hidden'), true);
  check('menu-keyboard-and-breakpoint', { escape: true, resize: true });
  await reduce(true); await navigate('/fr/');
  await expression('document.querySelector(".qa summary").focus()');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
  assert.equal(await expression('document.querySelector(".qa details").open'), true);
  check('faq-keyboard', { expanded: true });
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  await viewport(375); await navigate('/en/', false);
  const nojs = await expression('({text:document.body.innerText,main:!!document.querySelector("h1"),nav:getComputedStyle(document.querySelector("#menu")).display,veiled:document.querySelectorAll(".veiled").length})');
  assert(nojs.main); assert.equal(nojs.veiled, 0); assert.notEqual(nojs.nav, 'none'); assert.match(nojs.text, /1 hour free/);
  await screenshot('en-375-nojs'); check('no-javascript', { readable: true, menu: nojs.nav });
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });
  for (const path of ['/', '/fr/beta/', '/en/beta/']) {
    await navigate(path, false); assert.equal(await expression('document.forms.length'), 0);
    if (path === '/') assert.deepEqual(await expression('[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href"))'), ['/fr/', '/en/']);
    else assert(await expression('document.querySelector("button").disabled'));
  }
  check('selector-and-retired-intake', { noCollection: true, destinations: ['/fr/', '/en/'] });
  assert.deepEqual(blocked, []); assert.deepEqual(exceptions, []);
  assert(requests.every(r => r.method === 'GET'));
  check('network-and-runtime', { externalRequests: blocked.length, exceptions: exceptions.length, posts: requests.filter(r => r.method === 'POST').length });
  await writeFile(resolve(artifacts, `${prefix}-tests.json`), JSON.stringify({ origin: 'loopback-only', browser: await cdp.send('Browser.getVersion'), results, blocked, exceptions, requestCount: requests.length }, null, 2) + '\n');
  console.log(`PASS ${results.length} groups`);
} catch (error) {
  if (cdp) await screenshot('failure').catch(() => {});
  await writeFile(resolve(scratch, 'reprise-test-failure.json'), JSON.stringify({ results, blocked, exceptions, error: String(error) }, null, 2));
  throw error;
} finally {
  if (cdp) await cdp.send('Browser.close').catch(() => {});
  chrome.kill('SIGTERM'); await new Promise(r => server.close(r)); await log.close();
}
