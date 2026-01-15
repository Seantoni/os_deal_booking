import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ToastProvider from '@/components/common/ToastProvider';
import CommandPaletteProvider from '@/components/common/CommandPaletteProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OS Deals Booking",
  description: "OfertaSimple booking and reservation management system",
  // icon.png in app/ directory is automatically used by Next.js
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover', // Enable safe area support on iOS
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES}>
    <html lang="es" style={{ colorScheme: 'light' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider />
        <CommandPaletteProvider>
          {children}
        </CommandPaletteProvider>
        {/* Vercel Analytics - tracks page views and custom events */}
        <Analytics />
        {/* Vercel Speed Insights - tracks Core Web Vitals */}
        <SpeedInsights />
      </body>
    </html>
    </ClerkProvider>
  );
}
