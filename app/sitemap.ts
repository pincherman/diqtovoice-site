import type { MetadataRoute } from 'next';
import { origin, pagePath, publishedLocales, type PublicPage } from '@/lib/site-seo';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return (['home', 'legal', 'privacy'] as PublicPage[]).flatMap(page => publishedLocales.map(locale => ({
    url: origin + pagePath(locale, page),
    alternates: { languages: { fr: origin + pagePath('fr', page), en: origin + pagePath('en', page), 'x-default': origin + (page === 'home' ? '/' : pagePath('fr', page)) } },
  })));
}
