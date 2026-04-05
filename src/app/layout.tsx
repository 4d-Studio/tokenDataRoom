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
  "Token is a secure dataroom for deals, due diligence, and board communications. Password-protected rooms, optional NDAs, and client-side encryption.";

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
    default: `${siteName} — Secure data rooms`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    title: `${siteName} — Secure data rooms`,
    description: siteDescription,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — Secure data rooms`,
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
