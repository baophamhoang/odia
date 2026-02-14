import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        port: '',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
