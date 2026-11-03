import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n';
import { homeCopy } from '@/lib/launch-copy';
export const origin = 'https://diqtovoice.com';
export const publishedLocales = ['fr', 'en'] as const;
export type PublicPage = 'home' | 'legal' | 'privacy';
export const pagePath = (locale: Locale, page: PublicPage) => `/${locale}/${page === 'home' ? '' : `${page}/`}`;
// Shared by head and sitemap: every alternate targets a canonical URL.
export const pageLanguages = (page: PublicPage) => ({
  fr: origin + pagePath('fr', page), en: origin + pagePath('en', page),
  'x-default': origin + pagePath('en', page),
});
// Editorial dates: update only after a significant change, never at build time.
export const pageLastModified = { home: '2026-11-03', privacy: '2026-11-02' } as const;
export const websiteSchema = {
  '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Diqto Voice',
  alternateName: ['diqtovoice.com'], url: `${origin}/`,
  publisher: { '@id': `${origin}/#organization` },
};
const descriptions = {
  fr: { home: ['Diqto Voice | Traduction vocale pour vos réunions', 'Parlez votre langue, comprenez vos interlocuteurs. Découvrez Diqto Voice, la traduction vocale pour vos réunions sur Windows et Mac. Lancement en préparation.'], legal: ['Mentions légales | Diqto Voice', 'Éditeur DIQTO SAS, directeur de la publication et hébergement GitHub Pages : les mentions légales de diqtovoice.com.'], privacy: ['Confidentialité | Diqto Voice', 'Informations sur la confidentialité de diqtovoice.com : aucun formulaire, aucune publicité, aucun traceur ajouté ; journaux techniques de l’hébergeur.'] },
  en: { home: ['Diqto Voice | Voice translation for your meetings', 'Speak your language and understand the other person. Discover Diqto Voice, voice translation for meetings on Windows and Mac. Getting ready to launch.'], legal: ['Legal notice | Diqto Voice', 'Publisher DIQTO SAS, publication director and GitHub Pages hosting: the legal notice for diqtovoice.com.'], privacy: ['Privacy | Diqto Voice', 'Privacy information for diqtovoice.com: no forms, no advertising and no added trackers; technical logs handled by the hosting provider.'] },
};
export function publicMetadata(locale: Locale, page: PublicPage = 'home'): Metadata {
  const [title, description] = descriptions[locale][page];
  const languages = pageLanguages(page);
  return { metadataBase: new URL(origin), title, description,
    alternates: { canonical: origin + pagePath(locale, page), languages },
    robots: page === 'legal' ? 'noindex, noarchive, nosnippet' : { index: true, follow: true },
    openGraph: { title, description, url: origin + pagePath(locale, page), siteName: 'Diqto Voice', type: 'website', locale: locale === 'fr' ? 'fr_FR' : 'en_US', alternateLocale: locale === 'fr' ? 'en_US' : 'fr_FR', images: [{ url: '/motion/globe-still.png', alt: 'Diqto Voice' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/motion/globe-still.png'] },
  };
}
export function homeSchema(locale: Locale) {
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'DIQTO', legalName: 'DIQTO SAS', identifier: { '@type': 'PropertyValue', propertyID: 'SIREN', value: '106 569 619' }, url: origin, logo: `${origin}/favicon.svg`, address: { '@type': 'PostalAddress', addressLocality: 'Marseille', addressCountry: 'FR' } },
    websiteSchema,
    { '@type': 'SoftwareApplication', '@id': `${origin}/#software`, name: 'Diqto Voice', applicationCategory: 'CommunicationApplication', operatingSystem: ['macOS', 'Windows'], description: descriptions[locale].home[1], inLanguage: locale, url: origin + pagePath(locale, 'home'), publisher: { '@id': `${origin}/#organization` } },
    { '@type': 'FAQPage', '@id': origin + pagePath(locale, 'home') + '#questions', inLanguage: locale, mainEntity: homeCopy[locale].FAQ.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
  ] };
}
