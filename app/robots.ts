import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  const aiAgents = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...['Googlebot', 'Bingbot'].map(userAgent => ({ userAgent, allow: '/' })),
      ...aiAgents.map(userAgent => ({ userAgent, allow: '/', disallow: ['/fr/legal/', '/en/legal/'] })),
    ],
    sitemap: 'https://diqtovoice.com/sitemap.xml',
    host: 'https://diqtovoice.com',
  };
}
