import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable strict mode to prevent double initialization of kuroshiro
  reactStrictMode: false,

  // Tailnet preview hosts used for local Windows acceptance.
  allowedDevOrigins: ['100.120.69.1', '100.86.60.101'],

  // Pin the project root so Next does not infer C:\Users\sai from the parent lockfile.
  turbopack: {
    root: process.cwd(),
  },

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
