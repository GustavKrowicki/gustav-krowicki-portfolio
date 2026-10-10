import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The previous portfolio used /projects/<slug>; those URLs still get visits.
  async redirects() {
    return [
      { source: "/projects/internship-at-valtech-2024", destination: "/work/valtech", permanent: false },
      { source: "/projects/:slug*", destination: "/work", permanent: false },
    ];
  },
};

export default nextConfig;
