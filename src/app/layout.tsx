import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/Providers/ThemeProvider";
import Toaster from "@/components/ui/sonner";
import { defaultMetadata, defaultViewport } from "@/lib/head";
import DBGate from "@/components/Common/DBGate";
import GlobalCommand from "@/components/Common/GlobalCommand";
import { getUser } from "@/lib/auth/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...defaultMetadata,
};

export const viewport: Viewport = {
  ...defaultViewport,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scroll-smooth`}
      >
        <ThemeProvider>
          <DBGate>
            {children}
            <Toaster />
          </DBGate>
          {user && <GlobalCommand />}
        </ThemeProvider>
      </body>
    </html>
  );
}
