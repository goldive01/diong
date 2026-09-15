import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pass 8 Step 4: safe, non-breaking production security headers only.
  // Deliberately does NOT include a Content-Security-Policy — a strict CSP
  // needs live-browser verification against Next's hydration scripts,
  // Supabase's project-specific origin, and the service worker, none of
  // which can be safely hand-written and shipped untested here. A
  // recommended CSP is documented instead in
  // docs/PRODUCTION_DEPLOYMENT.md rather than risk breaking auth, images,
  // or the PWA with an unverified policy. X-XSS-Protection is deliberately
  // omitted too — obsolete, superseded by CSP, and can itself introduce
  // XSS vectors in old browsers.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
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
