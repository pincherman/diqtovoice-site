import type { Metadata } from 'next';
import { homeCopy } from '@/lib/launch-copy';
import { publicMetadata } from '@/lib/site-seo';
import fr from '@/content/home/fr.json';
import type { Locale } from '@/lib/i18n';
export { homeCopy };
export const siteOrder = ['es', 'pt', 'fr', 'ja', 'ru', 'zh', 'de', 'ko', 'hi', 'id', 'vi', 'it', 'en'] as const;
export function homeMetadata(locale: Locale, beta = false): Metadata {
  if (!beta) return publicMetadata(locale);
  const c = homeCopy[locale].beta;
  return { ...publicMetadata(locale), title: `${c.title} — Diqto Voice`, description: c.intro, alternates: { canonical: `/${locale}/beta/` }, robots: { index: false, follow: true } };
}
export function pendingMetadata(locale: Locale, path: string): Metadata {
  const c = homeCopy[locale].legacy;
  return { ...homeMetadata(locale), title: c.title, description: c.notice, robots: { index: false, follow: true },
    alternates: { canonical: path }, openGraph: { title: c.title, description: c.notice, url: `https://diqtovoice.com${path}`, type: 'website' } };
}
export function languageName(code: string) {
  return fr.motion.LANGS.find(([language]) => language === code)?.[1] ?? code;
}
