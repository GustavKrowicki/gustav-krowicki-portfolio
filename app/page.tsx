import type { Metadata, Viewport } from "next";
import PortfolioShell from "@/components/shell/PortfolioShell";

// The one-page portfolio: the panel beside the live city. /new and /city redirect here (public/_redirects).
// Same viewport as the city editor: pinch gestures go to the city canvas, not to page zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// The title and description come from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <PortfolioShell />;
}
