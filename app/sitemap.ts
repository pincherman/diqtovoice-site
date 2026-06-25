import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const routes = ['', '/beta', '/roi', '/security', '/en', '/en/beta', '/en/roi', '/en/security', '/fr', '/fr/beta', '/fr/roi', '/fr/security'];
const lastModified = new Date('2026-06-25T00:00:00.000Z');

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://diqtovoice.com${route}`,
    lastModified,
    changeFrequency: route === '' || route === '/fr' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/fr' ? 0.9 : 0.7,
  }));
}
