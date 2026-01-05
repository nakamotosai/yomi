import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable strict mode to prevent double initialization of kuroshiro
  reactStrictMode: false,

  // Empty turbopack config to silence the warning
  turbopack: {},

  // Allow loading dictionary files
  async headers() {
    return [
      {
        source: '/dict/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
