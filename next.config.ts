import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'export',
  trailingSlash: true,
  // A shared-cache test build may supply paths without copying dependencies.
  typescript: { tsconfigPath: process.env.SITE_TYPESCRIPT_CONFIG ?? 'tsconfig.json' },
};

export default nextConfig;
