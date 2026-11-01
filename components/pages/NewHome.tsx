import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homeCopy, languageName, siteOrder } from '@/lib/home-copy';
import type { Locale } from '@/lib/i18n';
import wall from '@/content/home/wall.json';

const template = readFileSync(join(process.cwd(), 'content/home/template.html'), 'utf8');
const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function NewHome({ locale }: { locale: Locale }) {
  const c = homeCopy[locale];
  const languages = siteOrder.map((code) => {
    const current = code === locale ? ' aria-current="page"' : '';
    const content = code === 'fr' || code === 'en'
      ? `<a href="/${code}/"${current}>${escape(languageName(code))}</a>`
      : `<span aria-disabled="true" title="${escape(c.ui.pendingLanguage)}">${escape(languageName(code))}</span>`;
    return `<li lang="${code}" dir="auto"${code === locale ? ' aria-current="true"' : ''}>${content}</li>`;
  }).join('');
  const plans = c.motion.TARIFS.map((p) => `<article class="plan${p.vedette ? ' feat' : ''}" aria-labelledby="plan-${p.id}">
    <h3 id="plan-${p.id}">${escape(p.nom)}</h3><p class="price"><b>${escape(p.prix)}</b><span>${escape(p.unite)}</span></p>
    <ul>${p.points.map((point) => `<li>${escape(point)}</li>`).join('')}</ul>
    <button type="button" class="btn big${p.vedette ? '' : ' ghost'}" disabled aria-describedby="plan-msg-${p.id}">${escape(p.bouton)}</button>
    <p class="msg" id="plan-msg-${p.id}">${escape(p.message)}</p></article>`).join('');
  const replacements: Record<string, string> = {
    ...Object.fromEntries(Object.entries(c.static).map(([key, value]) => [key, escape(value)])),
    LANGUAGES: languages, PLANS: plans,
    FAQ: c.FAQ.map(({ question, answer }) => `<details><summary>${escape(question)}</summary><p>${escape(answer)}</p></details>`).join(''),
    NAMES: c.motion.LANGS.map(([code, name]) => `<li lang="${code}" dir="auto">${escape(name)}</li>`).join(''),
  };
  const html = template.replace(/\{\{([A-Z_a-z0-9]+)\}\}/g, (_, key: string) => {
    if (!(key in replacements)) throw new Error(`Missing home corpus key: ${locale}/${key}`);
    return replacements[key];
  });
  const motion = JSON.stringify({ ...c.motion, WALL: wall, ui: c.ui }).replace(/</g, '\\u003c');
  return <>
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
    <script id="home-corpus" type="application/json" dangerouslySetInnerHTML={{ __html: motion }} />
    <script src="/motion/home.js" defer />
  </>;
}
