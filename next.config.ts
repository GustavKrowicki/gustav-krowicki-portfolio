import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export served by Cloudflare Workers static assets (docs/hosting-cloudflare.md).
  // Server code goes in the Worker, not in Next.js API routes, middleware or server actions.
  output: "export",
  // No image optimizer in a static export; images are served as they are in public/.
  images: { unoptimized: true },
  // The /projects/* redirects for the previous portfolio live in public/_redirects.
};

export default nextConfig;
