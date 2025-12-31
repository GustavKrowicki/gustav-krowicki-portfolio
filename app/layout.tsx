import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutContent from "@/components/ui/LayoutContent";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
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
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen flex flex-col">
        <LayoutContent>
          {children}
        </LayoutContent>
      </body>
    </html>
  );
}
