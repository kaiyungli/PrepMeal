import type { NextConfig } from "next";
import { legacyRecipeRedirects } from "./src/constants/legacyRecipeRedirects";

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
      ...Object.entries(legacyRecipeRedirects).map(([from, to]) => ({
        source: `/recipes/${from}`, destination: `/recipes/${to}`, permanent: true,
      })),
    ];
  },
};

export default nextConfig;
