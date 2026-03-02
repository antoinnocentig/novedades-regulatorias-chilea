import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [{ source: '/api/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] }];
  },
};

export default nextConfig;
