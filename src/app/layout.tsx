import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { NavigationProgressDeferred } from "@/components/dataroom/navigation-progress-deferred";
import { TooltipProvider } from "@/components/ui/tooltip";

const sansFont = Inter({
  variable: "--font-tkn-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: true,
});

/** Public site name — the dataroom product is "Token". */
export const siteName = "Token";

const siteDescription =
  "Share sensitive files with outsiders—not your whole drive. Password-protected rooms, optional NDA, encryption in the browser before upload, and a clear activity trail.";

function metadataBaseUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
    } catch {
      /* use default */
    }
  }
  return new URL("https://token.fyi");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: `${siteName} — Deal rooms for outsiders`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    title: `${siteName} — Deal rooms for outsiders`,
    description: siteDescription,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — Deal rooms for outsiders`,
    description: siteDescription,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ee",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sansFont.variable}>
      <body>
        <TooltipProvider>
          <NavigationProgressDeferred />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
