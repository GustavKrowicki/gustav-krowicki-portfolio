import type { Metadata, Viewport } from "next";

// Same viewport as /city: pinch gestures go to the city canvas, not to page zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Work in progress: the one-page portfolio shell stays out of search results until it replaces /.
export const metadata: Metadata = {
  title: "Portfolio (new)",
  robots: { index: false, follow: false },
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return children;
}
