import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Pass 7: images stored in the diong-public-media Supabase Storage
    // bucket are served from https://<project-ref>.supabase.co/storage/v1/...
    // A wildcard subdomain (rather than parsing NEXT_PUBLIC_SUPABASE_URL at
    // config-load time) keeps this working across every Supabase project
    // without depending on env-loading order, while still scoping the
    // pathname to this one bucket.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/diong-public-media/**",
      },
    ],
  },
};

export default nextConfig;
