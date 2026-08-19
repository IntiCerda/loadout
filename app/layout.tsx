import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { BRAND, TAGLINE, SITE_URL } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${BRAND} -- ${TAGLINE}`,
  description:
    "Pick your tools, VS Code extensions, fonts, global packages and local AI models. Get one readable PowerShell script.",
  openGraph: {
    title: `${BRAND} -- ${TAGLINE}`,
    description: "One script for your whole Windows dev setup.",
    url: SITE_URL,
    siteName: BRAND,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-dvh flex flex-col antialiased">{children}</body>
    </html>
  );
}
