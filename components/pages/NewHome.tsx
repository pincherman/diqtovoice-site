import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homeCopy, languageName } from '@/lib/home-copy';
import { homeSchema } from '@/lib/site-seo';
import type { Locale } from '@/lib/i18n';
import wall from '@/content/home/wall.json';
const template = readFileSync(join(process.cwd(), 'content/home/template.html'), 'utf8');
const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const json = (data: unknown) => JSON.stringify(data).replace(/</g, '\u003c');
export function NewHome({ locale }: { locale: Locale }) {
  const c = homeCopy[locale];
  const languages = (['fr', 'en'] as const).map((code) =>
    `<li lang="${code}"><a href="/${code}/"${code === locale ? ' aria-current="page"' : ''}>${escape(languageName(code))}</a></li>`).join('');
  const replacements: Record<string, string> = {
    ...Object.fromEntries(Object.entries(c.static).map(([key, value]) => [key, escape(value)])),
    LANGUAGES: languages, LEGAL_URL: `/${locale}/legal/`, PRIVACY_URL: `/${locale}/privacy/`,
    FAQ: c.FAQ.map(({ question, answer }) => `<details><summary>${escape(question)}</summary><p>${escape(answer)}</p></details>`).join(''),
    NAMES: c.motion.LANGS.map(([code, name]) => `<li lang="${code}" dir="auto">${escape(name)}</li>`).join(''),
  };
  const html = template.replace(/\{\{([A-Z_a-z0-9]+)\}\}/g, (_, key: string) => {
    if (!(key in replacements)) throw new Error(`Missing home corpus key: ${locale}/${key}`);
    return replacements[key];
  });
  return <>
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(homeSchema(locale)) }} />
    <script id="home-corpus" type="application/json" dangerouslySetInnerHTML={{ __html: json({ ...c.motion, WALL: wall, ui: c.ui }) }} />
    <script src="/motion/home.js" defer />
  </>;
}
