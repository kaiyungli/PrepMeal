import type { NextConfig } from "next";
import { editorialRecipeAliases } from "./src/constants/editorialRecipeLinks";

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
      ...Object.entries(editorialRecipeAliases).map(([legacy, canonical]) => ({
        source: `/recipes/${legacy}`, destination: `/recipes/${canonical}`, permanent: true,
      })),
    ];
  },
};

export default nextConfig;
