import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.balsoaconsulting.com"),
  title: "Balsoa Consulting | Energy, Oil & Gas Advisory & Engineering",
  description:
    "Vienna-based advisory and engineering for energy, oil and gas: CHP and gas distribution projects, pipeline equipment supply, project management and international business development.",
  openGraph: {
    title: "Balsoa Consulting",
    description: "Energy, Oil & Gas Advisory & Engineering Solutions",
    url: "/",
    siteName: "Balsoa Consulting",
    locale: "en",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#06080b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
