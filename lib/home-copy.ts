import type { Metadata } from 'next';
import fr from '@/content/home/fr.json';
import en from '@/content/home/en.json';
import type { Locale } from '@/lib/i18n';

export const homeCopy = { fr, en };
export const siteOrder = ['es', 'pt', 'fr', 'ja', 'ru', 'zh', 'de', 'ko', 'hi', 'id', 'vi', 'it', 'en'] as const;
export function homeMetadata(locale: Locale, beta = false): Metadata {
  const c = homeCopy[locale];
  const title = beta ? `${c.beta.title} — Diqto Voice` : c.seo.title;
  const description = beta ? c.beta.intro : c.seo.description;
  return {
    metadataBase: new URL('https://diqtovoice.com'), title, description,
    alternates: { canonical: `/${locale}/${beta ? 'beta/' : ''}` },
    // Neither language is independently reviewed: no premature hreflang.
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `https://diqtovoice.com/${locale}/${beta ? 'beta/' : ''}`, siteName: 'Diqto Voice', type: 'website' },
  };
}
export function pendingMetadata(locale: Locale, path: string): Metadata {
  const c = homeCopy[locale].legacy;
  return { ...homeMetadata(locale), title: c.title, description: c.notice,
    alternates: { canonical: path }, openGraph: { title: c.title, description: c.notice, url: `https://diqtovoice.com${path}`, type: 'website' } };
}
export function languageName(code: string) {
  return fr.motion.LANGS.find(([language]) => language === code)?.[1] ?? code;
}
