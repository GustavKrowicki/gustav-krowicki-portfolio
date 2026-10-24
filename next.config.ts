import type { NextConfig } from "next";

// CF_IMAGE_TRANSFORMS=1 is set only for the build that goes live on www.gustavkrowicki.com (npm run cf:build:live).
// Previews on workers.dev and local builds serve the images in public/ as they are.
const cloudflareImageTransforms = process.env.CF_IMAGE_TRANSFORMS === "1";

const nextConfig: NextConfig = {
  // Static export served by Cloudflare Workers static assets (docs/hosting-cloudflare.md).
  // Server code goes in the Worker, not in Next.js API routes, middleware or server actions.
  output: "export",
  images: cloudflareImageTransforms
    ? { loader: "custom", loaderFile: "./lib/cloudflareImageLoader.ts" }
    : { unoptimized: true },
  // The /projects/* redirects for the previous portfolio live in public/_redirects.
};

export default nextConfig;
