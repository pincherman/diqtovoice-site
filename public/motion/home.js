(() => {
  const corpusNode = document.getElementById("home-corpus");
  if (!corpusNode) return;
  const copy = JSON.parse(corpusNode.textContent);
  const { LANGS, SENT, WALL, ui } = copy;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = motionPreference.matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = { night: css("--night"), n2: css("--night-2"), n3: css("--night-3"), ink: css("--ink"), muted: css("--muted"), faint: css("--faint"), line: css("--line"), green: css("--green"), soft: css("--green-soft") };
  const FONT = css("--font");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const fit = cv => {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    const x = cv.getContext("2d"); x.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: x, W: r.width, H: r.height };
  };

  // Horloge commune : une seule boucle ; chaque scène n'avance que si elle est visible et que la pause est levée.
  const scenes = [];
  let paused = false, last = performance.now(), frameId = 0;
  const active = () => !reduce && !paused && !document.hidden && scenes.some(s => s.visible && !s.finished);
  const sleep = () => { cancelAnimationFrame(frameId); frameId = 0; };
  const wake = () => { if (!frameId && active()) { last = performance.now(); frameId = requestAnimationFrame(loop); } };
  const loop = now => {
    frameId = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!active()) return;
    for (const s of scenes) if (s.visible && !s.finished) s.update(dt);
    if (active()) frameId = requestAnimationFrame(loop);
  };
  const watch = (el, s, threshold = 0.05) => {
    const io = "IntersectionObserver" in window;
    s.visible = !io;
    scenes.push(s);
    if (io) new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      if (active()) wake(); else sleep();
    }, { threshold }).observe(el);
    wake();
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden) sleep(); else wake(); });

  /* ---------- 1. Le mur multilingue mélangé, commun à toutes les pages ---------- */
  const wall = (() => {
    const host = document.querySelector('[data-scene="wall"]'), cv = host.querySelector("canvas");
    const veils = host.querySelectorAll("[data-veil]");
    let g, bricks = [], t = 0, revealed = false, done = false, rowH, fs;
    const WORDS = WALL.PARDON.flatMap((p, i) => [p, WALL.COMPRENDS.at(i), WALL.REPETER.at(i), WALL.LENTEMENT.at(i)]);
    const build = () => {
      g = fit(cv); bricks = []; t = 0; revealed = false; done = false;
      rowH = clamp(g.W / 17, 36, 60); fs = Math.round(rowH * 0.4);
      g.ctx.font = `600 ${fs}px ${FONT}`;
      const rows = Math.ceil(g.H / rowH); let k = 0;
      for (let r = 0; r < rows; r++) {
        let x = -Math.random() * rowH * 2 - (r % 2 ? rowH : 0);
        while (x < g.W) {
          const word = WORDS[k++ % WORDS.length], w = g.ctx.measureText(word).width + rowH * 0.95;
          bricks.push({ x, y: g.H - (r + 1) * rowH, w, h: rowH, word, delay: r * 0.075 + Math.random() * 0.18, hit: false, vx: 0, vy: 0, rot: 0, vr: 0, flash: 0, a: 1 });
          x += w;
        }
        k += 5;
      }
      // Keep the headline visible from first paint; the wall animates behind it.
    };
    const BUILD = () => bricks.reduce((m, b) => Math.max(m, b.delay), 0) + 0.5;
    const mix = (a, b, k) => {
      const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
      return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(k, 0, 1))).join(",")})`;
    };
    const draw = () => {
      const { ctx, W, H } = g; ctx.clearRect(0, 0, W, H);
      const waveStart = BUILD() + 0.7, waveX = -0.2 * W + ease((t - waveStart) / 1.25) * 1.45 * W, waving = t > waveStart;
      ctx.font = `600 ${fs}px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "center";
      let alive = 0;
      for (const b of bricks) {
        if (b.a <= 0) continue; alive++;
        const p = ease((t - b.delay) / 0.5);
        if (p <= 0) continue;
        const y = b.y - (1 - p) * g.H * 0.55;
        ctx.save(); ctx.globalAlpha = p * b.a;
        ctx.translate(b.x + b.w / 2, y + b.h / 2); ctx.rotate(b.rot);
        const inset = 3, rw = b.w - inset * 2, rh = b.h - inset * 2;
        ctx.beginPath(); ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 8);
        ctx.fillStyle = b.flash > 0 ? mix(C.n3, C.green, b.flash) : C.n2; ctx.fill();
        ctx.strokeStyle = b.flash > 0 ? C.green : C.line; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = b.flash > 0.4 ? C.night : C.muted; ctx.fillText(b.word, 0, 1);
        ctx.restore();
      }
      if (waving && waveX < W * 1.25) {
        const grad = ctx.createLinearGradient(waveX - 180, 0, waveX + 40, 0);
        grad.addColorStop(0, "rgba(37,211,102,0)"); grad.addColorStop(0.8, "rgba(37,211,102,.28)"); grad.addColorStop(1, "rgba(37,211,102,0)");
        ctx.fillStyle = grad; ctx.fillRect(waveX - 180, 0, 220, H);
        ctx.beginPath();
        for (let y = 0; y <= H; y += 6) ctx.lineTo(waveX + Math.sin(y * 0.045 + t * 18) * 10 * Math.sin(y / H * Math.PI), y);
        ctx.strokeStyle = C.green; ctx.lineWidth = 2.5; ctx.shadowColor = C.green; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
      }
      return { waveX, waving, alive };
    };
    const update = dt => {
      if (done) return;
      t += dt;
      const { waveX, waving, alive } = draw();
      for (const b of bricks) {
        if (waving && !b.hit && waveX > b.x + b.w * 0.4) {
          b.hit = true; b.flash = 1;
          b.vx = 160 + Math.random() * 420; b.vy = -(120 + Math.random() * 420); b.vr = (Math.random() - 0.5) * 7;
        }
        if (b.hit) {
          b.vy += 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
          b.flash = Math.max(0, b.flash - dt * 2.2);
          if (b.y > g.H + 40 || b.x > g.W + 60) b.a = 0; else b.a = Math.max(0, b.a - dt * 0.35);
        }
      }
      if (waving && !revealed && waveX > g.W * 0.3) { revealed = true; veils.forEach(v => v.classList.remove("veiled")); }
      if (revealed && alive === 0) { done = true; s.finished = true; g.ctx.clearRect(0, 0, g.W, g.H); }
    };
    const s = { update, resize() { if (!done && !reduce) { build(); draw(); } }, still() {
      done = true; s.finished = true;
      if (g) g.ctx.clearRect(0, 0, g.W, g.H);
      veils.forEach(v => v.classList.remove("veiled"));
    } };
    if (reduce) { s.still(); watch(host, s); return s; }
    build(); watch(host, s);
    return s;
  })();

  /* ---------- 2. Le globe ---------- */
  const globe = (() => {
    const host = document.querySelector('[data-scene="globe"]'), cv = host.querySelector("canvas");
    const src = host.querySelector(".bub.src"), dst = host.querySelector(".bub.dst");
    const MASK = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/+AAAP//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////z//////g4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAef//4////////wAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAA////Af//////+AAAAAj/wAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAADwH//4f///////4AAAAB/8AAAAAAAAAAAAL4AAAAAAAAAAAAAAAAAAAAAAAcABgP/A////////+AAAAAPHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AAAxP+AP////////AAAAACAAAAAAAAwAAAAB+oAAAAAAAAAAAAAAAAAAAAAH7w+Th8AAAf/////8AAAAAAAAAAAAD4AAAAP///AAAB/AAAAAAAAAAAAAAAAA8AAz/8AAAH/////8AAAAAAAAAAAAPAAAAP///+AAAA4AAAAAAAAAAAAAAAP8AIeeEAAAAD/////4AAAAAAAAAAAA8AAAAf///+ACAAEAAAAAAAAAAAAAAAf/y4+cd/wAAD/////wAAAAAAAAAAABwAHAH///////4AGAAAAAAAAAAAAAAAPP/8OQ//8AAB/////wAAAAAAAAAAADwAPP////////4gf/AAAAAAAAP8AAAAAH/+A8f//4AA////+wAAAAAAB/AAAA4Afv/////////////4AAAAAB///wA/QH//j+B6f+AB3////gAAAAAA//4AAAAAfv/////////////8AnwgAP///////+f8HPxwP+AAX///8AAAAAAH///wABC/nn/////////////////+AD////////////3wZ/wA///4AAAAAAAH///+M////v//////////////////4A/////////////wB/8A///wAAAAAAAf///+P////f/////////////////v4f/////////////AD+cAf/+AA/8AAAA/+/+D///////////////////////BwP////////////7w//AAP/wAAf8AAAB/8/+T//////////////////////+AAAf///////////DIB/wAP/gAAHgAAAH/5/////////////////////////+AAH///////////+AQAfAAD/AAAAAAAA//H/////////////////////////+AAP///////////4AA/AAAB/AAAAAAAB/+H//////////////////////3v/AAAH///////////wAA/wAAAOAAAAAAAB//H//////////////////////Af4AAAA/5gH///////gAA/4QAAAAAAAAAAB//hh////////////////////8BwAAAAAHwAA///////4AA/84AAAAAAAAAAA5/A///////////////////8AAHAAAAAADsAAP//////8AAf/8AAAAAAAAA8AA+C///////////////////wAAfgAAAAAGAAAH///////wAf/+AAAAAAAAA8AOeH///////////////////AAA/gAAAAA4AAAD///////8Af//AAAAAAAAA8APwH//////////////////+AAA/AAAAAAAAAAAf///////x///wAAAAAAAHOAGBP//////////////////8AAA/AAAAAAAAAABP///////x///8AAAAAAAPHAP/////////////////////6AA8AAAAAAAAAAAH///////5///8AAAAAAAPPx//////////////////////+AA4AAAAAAAAAAAD///////5///8AAAAAAAMPj//////////////////////6AAwAAAAAAAAAAAD///////////kAAAAAAAAIP//////////////////////7AAAAAAAAAAAAAAB/////////+AOAAAAAAAAA///////////////////////zAAAAAAAAAAAAAAAf/////////wfgAAAAAAAP///////////////////////yAAAAAAAAAAAAAAAP/////////gfgAAAAAAAP///////////////////////iAAAAAAAAAAAAAAAP/////////xAAAAAAAAAD//////P////////////////CAAAAAAAAAAAAAAAP//////////AAAAAAAAAB/////GP///////////////+AAAAAAAAAAAAAAAAP////////+4AAAAAAAAAB//H/+CP///////////////8CAAAAAAAAAAAAAAAP////////wgAAAAAAAAAD/jj/+AD///////////////4HgAAAAAAAAAAAAAAP////////gAAAAAAAAAH/4Bw/8AB//////////////+APAAAAAAAAAAAAAAAP////////gAAAAAAAAAH/4A8f8PA//////////////8AAAAAAAAAAAAAAAAAP///////+AAAAAAAAAAH/gMHfP///////////////v4AIAAAAAAAAAAAAAAAP///////8AAAAAAAAAAH/AMCOP//////////////+JwAMAAAAAAAAAAAAAAAH///////4AAAAAAAAAAH/AACHH//////////////8BwAIAAAAAAAAAAAAAAAD///////wAAAAAAAAAAH+AAYHH//////////////+g4AYAAAAAAAAAAAAAAAD///////wAAAAAAAAAAAgP+AABs//////////////g4D4AAAAAAAAAAAAAAAB///////wAAAAAAAAAAAh/+AAAA//////////////A4HwAAAAAAAAAAAAAAAA///////gAAAAAAAAAAA//+AAAA//////////////Aw+AAAAAAAAAAAAAAAAAP/////+AAAAAAAAAAAD//+AAAB//////////////ADwAAAAAAAAAAAAAAAAAH/////8AAAAAAAAAAAH///wGAB//////////////gDAAAAAAAAAAAAAAAAAAH/////4AAAAAAAAAAAP///8PwD//////////////wCAAAAAAAAAAAAAAAAAACf////4AAAAAAAAAAAP////P////////////////gAAAAAAAAAAAAAAAAAAABP//3gYAAAAAAAAAAAP/////////P///////////wAAAAAAAAAAAAAAAAAAAAv//AAYAAAAAAAAAAAf/////////H///////////wAAAAAAAAAAAAAAAAAAAA3/+AAcAAAAAAAAAAB///////9//j///////////gAAAAAAAAAAAAAAAAAAAAR/+AAMAAAAAAAAAAD///////8//wH//////////AAAAAAAAAAAAAAAAAAAAAJ/+AAEAAAAAAAAAAH///////+f/4D//////////AAAAAAAAAAAAAAAAAAAAAM/+AAAAAAAAAAAAAH///////+f/8YAf///////8QAAAAAAAAAAAAAAAAAAAACf8AAAAAAAAAAAAAP////////P//8AP///////4wAAAAAAAAAAAAAAAAAAAAAP8AA+AAAAAAAAAAP////////H//+AH///////ggAAAAAAAAAAAAAAAAAAAAAH+AIBgAAAAAAAAAf////////n//+AD//4P//8AAAAAAAAAAAAAAAAAAAAAAAH+A4A4AAAAAAAAAf////////j//+AAf/4P/+AAAAAAAAAAAAAAAAgAAAAAAAH/B4ABwAAAAAAAAP////////h//8AAf/gH/8YAAAAAAAAAAAAAAAAAAAAAAAD/nwAB4AAAAAAAAP////////x//4AAf/AD/8QAAAAAAAAAAAAAAAAAAAAAAAAf/wAAAAAAAAAAAP////////4//gAAf+AD/+AAwAAAAAAAAAAAAAAAAAAAAAAH/wAAAAAAAAAAAP////////4f+AAAf8ADf/AAwAAAAAAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAf////////8f8AAAPwAAP/gAwAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAf////////+fgAAAPwAAP/gAwAAAAAAAAAAAAAAAAAAAAAAAAfgAAAAAAAAAAf/////////eAAAAHwAAP/gAUAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAf/////////gAAAAHwAAN/gAAAAAAAAAAAAAAAAAAAAAAAAAADABoAAAAAAAAP/////////gIAAAHwAAMfgAKAAAAAAAAAAAAAAAAAAAAAAAADgH/IAAAAAAAH/////////34AAADwAAIOAAMAAAAAAAAAAAAAAAAAAAAAAAAAwPf+AAAAAAAD//////////4AAADgAAIEAAAAAAAAAAAAAAAAAAAAAAAAAAAAd///AAAAAAAB//////////wAAABIAAMAAADAAAAAAAAAAAAAAAAAAAAAAAAAE///gAAAAAAB//////////wAAAAMAAEAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAf//wAAAAAAAf/////////gAAAAMAADAAIDAAAAAAAAAAAAAAAAAAAAAAAAAAf///gAAAAAAP/B///////gAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAf///wAAAAAACAA///////AAAAAAAAzgA8AAAAAAAAAAAAAAAAAAAAAAAAAAAf///4AAAAAAAAAD/////+AAAAAAAAZgB8AAAAAAAAAAAAAAAAAAAAAAAAAAA////4AAAAAAAAAD/////8AAAAAAAAMwH8AAAAAAAAAAAAAAAAAAAAAAAAAAB////8AAAAAAAAAD/////4AAAAAAAAHQf8AAAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAH/////gAAAAAAAAHwf8UQAAAAAAAAAAAAAAAAAAAAAAAAD/////AAAAAAAAAH/////gAAAAAAAADwf4AAgAAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAAH/////AAAAAAAAADwP5wBwAAAAAAAAAAAAAAAAAAAAAAAD/////+AAAAAAAAD////+AAAAAAAAAB8PxwAz4AAAAAAAAAAAAAAAAAAAAAAD//////4AAAAAAAB////8AAAAAAAAAA8AxQgf+AAAAAAAAAAAAAAAAAAAAAAH//////8AAAAAAAA////8AAAAAAAAAAcABIAH/gAAAAAAAAAAAAAAAAAAAAAH///////gAAAAAAA////4AAAAAAAAAAMAAAAA/wwAAAAAAAAAAAAAAAAAAAAD///////gAAAAAAA////4AAAAAAAAAADAAAAI/4AAAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///4AAAAAAAAAAB/AAAA/4AAAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///4AAAAAAAAAAABEAAAOMAAAAAAAAAAAAAAAAAAAAAA///////gAAAAAAAf///8AAAAAAAAAAAAACAAAGAAAAAAAAAAAAAAAAAAAAAA///////AAAAAAAAP///8AAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAf/////+AAAAAAAAP///8AAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAf/////8AAAAAAAAf///+AAAAAAAAAAAAAAB+CAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAAf///+AwAAAAAAAAAAAAD8GAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAA////+AwAAAAAAAAAAAB38HAAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAA////8BwAAAAAAAAAAAD/8HgAAAAAAAAAAAAAAAAAAAAAAB/////4AAAAAAAA////8HwAAAAAAAAAAAH//HgAAAAAAAAAAAAAAAAAAAAAAAf////4AAAAAAAA////wPwAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAA////gPgAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAAf///4AAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAD////+AAAAAAAAAAAAAAAAAAAAAAAP////gAAAAAAAAP//+AfAAAAAAAAAAAf////+AAEAAAAAAAAAAAAAAAAAAAAP////AAAAAAAAAP//+AfAAAAAAAAAAA//////AAAAAAAAAAAAAAAAAAAAAAAP///4AAAAAAAAAH//+APAAAAAAAAAAA//////gAAAAAAAAAAAAAAAAAAAAAAP///gAAAAAAAAAH//+AOAAAAAAAAAAB//////wAAAAAAAAAAAAAAAAAAAAAAP///AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAD//wAAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//8AAAAAAAAAAB//gAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAAf//4AAAAAAAAAAB//gAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///wAAAAAAAAAAA//AAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAAf//wAAAAAAAAAAA/+AAAAAAAAAAAAAAP/AP//wAAAAAAAAAAAAAAAAAAAAAA///gAAAAAAAAAAA/4AAAAAAAAAAAAAAf8AH//gAAAAAAAAAAAAAAAAAAAAAA///AAAAAAAAAAAAYAAAAAAAAAAAAAAAeAAE//gAAAAAAAAAAAAAAAAAAAAAA//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/AAABAAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAgAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAQAAAAAAAAAAAAAAAAAB//gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYAAAA8AAAAAAAAAAAAAAAAAB/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAADAAAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAGAAAAAAAAAAAAAAAAAAB/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH8AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const bits = Uint8Array.from(atob(MASK), c => c.charCodeAt(0));
    const land = (r, c) => (bits[(r * 360 + c) >> 3] >> (7 - ((r * 360 + c) & 7))) & 1;
    const D = Math.PI / 180;
    const vec = (lon, lat) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    // Points des terres : une rangée tous les 1,6°, espacement constant en distance.
    const pts = [];
    for (let lat = 88.5; lat > -60; lat -= 1.6) {
      const step = 1.6 / Math.max(Math.cos(lat * D), 0.05);
      for (let lon = -180 + step / 2; lon < 180; lon += step) if (land(Math.floor(90 - lat), Math.floor(lon + 180) % 360)) pts.push(vec(lon, lat));
    }
    const PARIS = { name: copy.originName, v: vec(2.35, 48.86) };
    const CITIES = copy.CITIES.map(([name, lon, lat, lang, text]) => ({ name, v: vec(lon, lat), lang, text }));
    const REPLY = { ...copy.REPLY, from: CITIES[copy.REPLY.fromIndex] };
    const T_TURN = 0.7, T_FLY = 1.0, T_LAND = 1.5, STEP = T_TURN + T_FLY + T_LAND;
    let g, cam = norm([1, 0.35, 0.9]), t = 0, R, cx, cy;
    const mid = (a, b) => norm([a[0] + b[0], a[1] + b[1], a[2] + b[2] + 0.25]);
    const slerp = (a, b, s) => {
      const o = Math.acos(clamp(dot(a, b), -1, 1)); if (o < 1e-4) return a;
      const k1 = Math.sin((1 - s) * o) / Math.sin(o), k2 = Math.sin(s * o) / Math.sin(o);
      return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
    };
    let E, N;
    const basis = () => { E = norm(cross([0, 0, 1], cam)); N = cross(cam, E); };
    const proj = (p, h = 0) => { const k = 1 + h; return { x: cx + dot(p, E) * R * k, y: cy - dot(p, N) * R * k, z: dot(p, cam) }; };
    const seen = q => q.z > 0 || Math.hypot(q.x - cx, q.y - cy) > R;
    const arcPt = (a, b, s) => { const o = Math.acos(clamp(dot(a, b), -1, 1)); return proj(slerp(a, b, s), 0.05 + Math.sin(Math.PI * s) * Math.min(0.32, o * 0.2)); };
    const drawArc = (a, b, s0, s1, color, alpha, width) => {
      const { ctx } = g; ctx.beginPath(); let pen = false;
      const n = 56;
      for (let i = 0; i <= n; i++) {
        const s = s0 + (s1 - s0) * i / n, q = arcPt(a, b, s);
        if (!seen(q)) { pen = false; continue; }
        if (pen) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); pen = true; }
      }
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.globalAlpha = 1;
    };
    const city = (q, color, r) => { const { ctx } = g; if (q.z <= 0) return; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fillStyle = color; ctx.fill(); };
    const place = (el, q, dir) => {
      const bw = el.offsetWidth, bh = el.offsetHeight, off = 26;
      let x = q.x + dir[0] * (bw / 2 + off), y = q.y + dir[1] * (bh / 2 + off);
      x = clamp(x, bw / 2 + 4, g.W - bw / 2 - 4); y = clamp(y, bh / 2 + 4, g.H - bh / 2 - 4);
      el.style.left = x + "px"; el.style.top = y + "px";
    };
    const fill = (el, [l, txt]) => { el.querySelector(".bl").textContent = l; el.querySelector(".bt").textContent = txt; };
    const resize = () => { g = fit(cv); R = Math.min(g.W * 0.46, g.H * 0.44); cx = g.W / 2; cy = g.H / 2; };
    const frame = () => {
      const { ctx, W, H } = g; ctx.clearRect(0, 0, W, H); basis();
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25);
      halo.addColorStop(0, "rgba(37,211,102,.14)"); halo.addColorStop(1, "rgba(37,211,102,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = C.n2; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
      const ds = Math.max(1.1, R / 210);
      ctx.fillStyle = C.muted;
      for (const p of pts) {
        const z = dot(p, cam); if (z <= 0.02) continue;
        ctx.globalAlpha = 0.18 + z * 0.62;
        ctx.fillRect(cx + dot(p, E) * R - ds / 2, cy - dot(p, N) * R - ds / 2, ds, ds);
      }
      ctx.globalAlpha = 1;
    };
    const update = dt => {
      if (!g) resize();
      t += dt;
      const cycle = CITIES.length * STEP + 5.5;
      if (t > cycle) t = 0;
      const i = Math.floor(t / STEP), lt = t - i * STEP;
      let target, active = null, phase = "";
      if (i < CITIES.length) { active = CITIES[i]; target = mid(PARIS.v, active.v); phase = lt < T_TURN ? "turn" : lt < T_TURN + T_FLY ? "fly" : "land"; }
      else target = mid(PARIS.v, REPLY.from.v);
      cam = norm(cam.map((c, k) => c + (target[k] - c) * Math.min(1, dt * 3.2)));
      frame();
      const P = proj(PARIS.v);
      const doneN = i < CITIES.length ? i : CITIES.length;
      for (let k = 0; k < doneN; k++) drawArc(PARIS.v, CITIES[k].v, 0, 1, C.green, 0.22, 1.2);
      for (let k = 0; k < doneN; k++) city(proj(CITIES[k].v), C.green, 2.6);
      city(P, C.ink, 4);
      let srcOn = false, dstOn = false;
      if (active) {
        const A = proj(active.v), dir = norm([A.x - P.x, A.y - P.y, 0]);
        if (phase === "fly" || phase === "land") {
          const s = phase === "fly" ? ease((lt - T_TURN) / T_FLY) : 1;
          drawArc(PARIS.v, active.v, Math.max(0, s - 0.45), s, C.green, 1, 2.6);
          const h = arcPt(PARIS.v, active.v, s);
          if (seen(h)) { g.ctx.beginPath(); g.ctx.arc(h.x, h.y, 4.5, 0, 7); g.ctx.fillStyle = C.soft; g.ctx.shadowColor = C.green; g.ctx.shadowBlur = 16; g.ctx.fill(); g.ctx.shadowBlur = 0; }
          fill(src, SENT); place(src, P, [-dir[0], -dir[1]]); srcOn = true;
        }
        if (phase === "land") {
          const k = (lt - T_TURN - T_FLY) / T_LAND;
          g.ctx.beginPath(); g.ctx.arc(A.x, A.y, 4 + k * 26, 0, 7); g.ctx.strokeStyle = C.green; g.ctx.globalAlpha = 1 - k; g.ctx.lineWidth = 2; g.ctx.stroke(); g.ctx.globalAlpha = 1;
          city(A, C.soft, 4);
          fill(dst, [active.lang + " · " + active.name, active.text]); place(dst, A, [dir[0], dir[1]]); dstOn = true;
        }
      } else {
        // Réponse : São Paulo vers Paris, entendue en français
        const lt2 = t - CITIES.length * STEP, F = REPLY.from, A = proj(F.v), dir = norm([P.x - A.x, P.y - A.y, 0]);
        const s = ease((lt2 - 0.8) / 1.3);
        if (lt2 > 0.8) {
          drawArc(F.v, PARIS.v, Math.max(0, s - 0.45), s, C.ink, 1, 2.6);
          fill(src, [REPLY.say[0] + " · " + F.name, REPLY.say[1]]); place(src, A, [-dir[0], -dir[1]]); srcOn = true;
        }
        if (lt2 > 2.2) { fill(dst, [REPLY.hear[0] + " · " + PARIS.name, REPLY.hear[1]]); place(dst, P, [dir[0], dir[1]]); dstOn = true; city(P, C.soft, 5); }
      }
      src.classList.toggle("on", srcOn); dst.classList.toggle("on", dstOn);
    };
    const still = () => {
      src.classList.remove("on"); dst.classList.remove("on");
      cam = norm(mid(PARIS.v, vec(75, 20))); frame();
      for (const c of CITIES) drawArc(PARIS.v, c.v, 0, 1, C.green, 0.55, 1.4);
      for (const c of CITIES) city(proj(c.v), C.green, 3);
      city(proj(PARIS.v), C.ink, 4.5);
    };
    const s = { update, still, resize() { resize(); if (reduce) still(); else update(0); } };
    resize();
    if (reduce) still();
    watch(host, s);
    return s;
  })();

  /* ---------- 3. L'interlocuteur n'installe rien : les répliques s'allument une à une ---------- */
  (() => {
    const host = document.querySelector('[data-scene="dialog"]'), lines = [...host.children];
    if (reduce || !("IntersectionObserver" in window)) return;
    host.classList.add("armed");
    let t = 0, done = false;
    const s = { update(dt) {
      if (done) return;
      t += dt;
      lines.forEach((li, i) => { if (t > 0.2 + i * 0.9) li.classList.add("lit"); });
      if (t > 0.2 + lines.length * 0.9) { done = true; s.finished = true; }
    } };
    watch(host, s, 0.4);
  })();

  /* ---------- 4. Bonjour ---------- */
  const hello = (() => {
    const host = document.querySelector('[data-scene="hello"]'), word = host.querySelector(".word"), name = host.querySelector(".lname");
    const list = document.querySelector(".names");
    const items = [...list.children];
    let i = 0, e = 0, out = false;
    // Un mot long (Здравствуйте) ne doit jamais déborder : on réduit sa taille à la largeur disponible.
    const fitWord = () => {
      word.style.fontSize = "";
      const room = host.clientWidth, w = word.getBoundingClientRect().width;
      if (w > room) word.style.fontSize = (parseFloat(getComputedStyle(word).fontSize) * room / w * 0.97) + "px";
    };
    const show = k => { word.textContent = LANGS[k][3]; word.lang = LANGS[k][0]; name.textContent = LANGS[k][1]; items.forEach((li, j) => li.classList.toggle("on", j === k)); fitWord(); };
    show(0);
    const update = dt => {
      e += dt;
      if (!out && e > 1.6) { out = true; host.classList.add("out"); }
      if (out && e > 1.95) { i = (i + 1) % LANGS.length; show(i); host.classList.remove("out"); out = false; e = 0; }
    };
    const s = { update, resize: fitWord, still() { i = 0; e = 0; out = false; host.classList.remove("out"); show(0); } };
    watch(host.parentElement, s);
    return s;
  })();


  /* ---------- En-tête : pause, menu, sélecteur de langue ---------- */
  const pauseBtn = document.getElementById("pause");
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    const label = paused ? ui.resume : ui.pause;
    pauseBtn.setAttribute("aria-label", label); pauseBtn.title = label;
    document.documentElement.classList.toggle("is-paused", paused);
    if (paused) sleep(); else wake();
  });
  const menuBtn = document.getElementById("menu-btn"), menu = document.getElementById("menu");
  const syncPause = () => {
    pauseBtn.disabled = reduce;
    const label = reduce ? ui.reduced : paused ? ui.resume : ui.pause;
    pauseBtn.setAttribute("aria-label", label); pauseBtn.title = label;
    pauseBtn.setAttribute("aria-pressed", String(paused));
  };
  syncPause();
  motionPreference.addEventListener("change", e => {
    reduce = e.matches;
    if (reduce) {
      sleep(); wall.still(); globe.still(); hello.still();
      document.querySelector('[data-scene="dialog"]').classList.remove("armed");
    }
    syncPause(); wake();
  });
  const setMenu = open => { menu.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open)); menuBtn.textContent = open ? ui.close : ui.menu; };
  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  const lang = document.querySelector(".head .lang");
  document.addEventListener("click", e => { if (lang.open && !lang.contains(e.target)) lang.open = false; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { lang.open = false; if (!menu.hidden) { setMenu(false); menuBtn.focus(); } } });
  matchMedia("(min-width: 881px)").addEventListener("change", e => { if (e.matches) setMenu(false); });

  document.documentElement.classList.add("motion-ready");
  const resize = () => { wall.resize(); globe.resize(); hello.resize(); wake(); };
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(resize, 150); });
  document.fonts.ready.then(resize);
})();
