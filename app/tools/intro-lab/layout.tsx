import type { Metadata, Viewport } from "next";

// Same viewport as /new: pinch gestures go to the city canvas, not to page zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Intro lab",
  robots: { index: false, follow: false },
};

export default function IntroLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
