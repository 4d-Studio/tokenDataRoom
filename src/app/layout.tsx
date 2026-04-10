import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { NavigationProgressDeferred } from "@/components/dataroom/navigation-progress-deferred";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  getPublicSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/dataroom/public-site";

const sansFont = Inter({
  variable: "--font-tkn-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: true,
});

/** @deprecated Use SITE_NAME from @/lib/dataroom/public-site */
export const siteName = SITE_NAME;

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: getPublicSiteUrl(),
  title: {
    default: `${SITE_NAME} — Deal rooms for outsiders`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: `${SITE_NAME} — Deal rooms for outsiders`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/banner.jpg",
        width: 1280,
        height: 720,
        alt: `${SITE_NAME} — encrypted rooms, one link`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Deal rooms for outsiders`,
    description: SITE_DESCRIPTION,
    images: ["/banner.jpg"],
  },
  robots: { index: true, follow: true },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
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
