/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import type { Metadata, Viewport } from "next";

const APP_NAME = process.env.APP_NAME;
const APP_URL = process.env.APP_URL;
const __rawPublicUrl = APP_URL;
const __metadataBase = __rawPublicUrl ? new URL(__rawPublicUrl) : undefined;

export const defaultMetadata: Metadata = {
  metadataBase: __metadataBase,
  title: APP_NAME,
  description: "Share files privately, securely, and beautifully with Swush.",
  applicationName: APP_NAME,
  authors: [
    { name: "Laith Alkhaddam (Iconical)", url: "https://iconical.dev" },
  ],
  manifest: "/manifest.json",
  keywords: ["file sharing", "secure upload", "Swush", "privacy"],
  openGraph: {
    title: APP_NAME,
    description: "Share files privately, securely, and beautifully with Swush.",
    url: APP_URL ?? "",
    siteName: APP_NAME,
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: "Share files privately, securely, and beautifully with Swush.",
    images: ["/images/og-image.png"],
    creator: "@sleepyiconical",
    site: "@sleepyiconical",
  },
  appleWebApp: {
    title: APP_NAME,
    capable: true,
    statusBarStyle: "default",
  },
};

export const defaultViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#604198",
};
