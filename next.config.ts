import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hivnajhqqvaokthzhugx.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      // Retired legacy weekly-menu page; /generate is the current planner.
      { source: '/menu', destination: '/generate', permanent: true },
    ];
  },
};

export default nextConfig;
