import type { MetadataRoute } from 'next';
import { origin, pagePath, pageLanguages, pageLastModified, publishedLocales } from '@/lib/site-seo';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return (['home', 'privacy'] as const).flatMap(page => publishedLocales.map(locale => ({
    url: origin + pagePath(locale, page),
    lastModified: pageLastModified[page],
    alternates: { languages: pageLanguages(page) },
  })));
}
