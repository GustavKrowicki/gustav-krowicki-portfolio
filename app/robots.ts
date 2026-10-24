import type { MetadataRoute } from "next";

// Static export: written to out/robots.txt at build time.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/tools/", "/city/editor"] },
    sitemap: "https://www.gustavkrowicki.com/sitemap.xml",
  };
}
