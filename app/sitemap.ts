import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
// Private, unreviewed integration: do not publish incomplete or legacy routes.
export default function sitemap(): MetadataRoute.Sitemap { return []; }
