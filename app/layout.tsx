import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "reactflow/dist/style.css";
import LayoutContent from "@/components/ui/LayoutContent";

const gtStandard = localFont({
  src: [
    {
      path: "./fonts/GT-Standard-L-Standard-Light-Trial copy.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Light-Oblique-Trial copy.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Regular-Trial copy.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Regular-Oblique-Trial copy.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Medium-Trial copy.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Medium-Oblique-Trial copy.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Semibold-Trial copy.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Semibold-Oblique-Trial copy.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Bold-Trial copy.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Bold-Oblique-Trial copy.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Heavy-Trial copy.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Heavy-Oblique-Trial copy.otf",
      weight: "800",
      style: "italic",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Black-Trial copy.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/GT-Standard-L-Standard-Black-Oblique-Trial copy.otf",
      weight: "900",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-gt-standard",
});

export const metadata: Metadata = {
  title: {
    default: "Gustav Krowicki - Product Designer",
    template: "%s | Gustav Krowicki"
  },
  description: "Product designer focused on research, ML/AI interfaces, and strategic thinking. Based in Copenhagen, Denmark.",
  keywords: ["Product Design", "UX Design", "User Research", "ML/AI", "Portfolio"],
  authors: [{ name: "Gustav Krowicki" }],
  creator: "Gustav Krowicki",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Gustav Krowicki - Product Designer",
    description: "Product designer focused on research, ML/AI interfaces, and strategic thinking.",
    siteName: "Gustav Krowicki Portfolio",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={gtStandard.variable}>
      <body className="antialiased min-h-screen flex flex-col">
        <LayoutContent>
          {children}
        </LayoutContent>
      </body>
    </html>
  );
}
