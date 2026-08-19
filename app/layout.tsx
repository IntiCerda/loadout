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
      <body className="min-h-dvh flex flex-col antialiased">
        {/* The picker is entirely client state: with scripting off the cards
            render but cannot be ticked, the size never moves off zero, and the
            download control stays a disabled button forever. Say so rather
            than shipping a page that looks alive and answers nothing. */}
        <noscript>
          <p className="border-warning bg-primary text-foreground mx-4 mt-4 max-w-3xl rounded-lg border px-4 py-3 text-sm sm:mx-auto">
            {BRAND} needs JavaScript to build a script. Without it the catalog
            below is a read-only list — nothing can be selected, downloaded or
            copied.
          </p>
        </noscript>
        {children}
      </body>
    </html>
  );
}
