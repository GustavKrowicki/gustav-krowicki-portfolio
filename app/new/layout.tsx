import type { Metadata, Viewport } from "next";

// Same viewport as /city: pinch gestures go to the city canvas, not to page zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// The one-page portfolio is the site: / redirects here (public/_redirects), so this is the canonical page.
// The title and description come from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/new" },
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return children;
}
