import type { Metadata } from "next";

// The grid editor is a dev tool: it is in the static export but stays out of search results.
export const metadata: Metadata = {
  title: "City editor",
  robots: { index: false, follow: false },
};

export default function CityEditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
