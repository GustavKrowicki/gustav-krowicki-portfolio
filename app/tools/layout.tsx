import type { Metadata } from "next";

// The sprite tools are dev tools: they are in the static export but stay out of search results.
export const metadata: Metadata = {
  title: "Tools",
  robots: { index: false, follow: false },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
