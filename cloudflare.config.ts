import { defineConfig } from "cf/config";

// Cloudflare Worker for the portfolio (docs/hosting-cloudflare.md). It serves the static export in out/;
// the build directory is set in wrangler.config.ts. Server code (live room, guestbook) comes later.
export default defineConfig({
  worker: {
    name: "portfolio",
    compatibilityDate: "2026-10-14",
    previewUrls: true,
    observability: { enabled: true },
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
    },
  },
});
