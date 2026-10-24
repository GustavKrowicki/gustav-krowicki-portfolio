import type { MetadataRoute } from "next";

// Static export: written to out/sitemap.xml at build time. The portfolio, city included, is the one page.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.gustavkrowicki.com/", changeFrequency: "monthly", priority: 1 },
  ];
}
