import type { Metadata } from "next";
import { Manrope, Geist } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const sansFont = Manrope({
  variable: "--font-filmia-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Filmia",
  description:
    "Elegant private rooms for password-protected documents with optional NDA gating.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
