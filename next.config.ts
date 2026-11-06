import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Recipe photos use versioned file names (…-v1.webp); a new photo gets a
    // new name. Keeping optimised copies for 31 days avoids re-fetching them
    // from Supabase Storage (≈2 s per miss in the logs).
    minimumCacheTTL: 2678400,
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
