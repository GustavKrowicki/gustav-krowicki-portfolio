import type { MetadataRoute } from "next";

// Static export: written to out/sitemap.xml at build time. / redirects to /new, so /new is listed instead.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.gustavkrowicki.com/new", changeFrequency: "monthly", priority: 1 },
    { url: "https://www.gustavkrowicki.com/city", changeFrequency: "monthly", priority: 0.8 },
  ];
}
