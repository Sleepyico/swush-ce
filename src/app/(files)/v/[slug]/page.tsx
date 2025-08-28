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

import type { Metadata } from "next";
import { defaultMetadata } from "@/lib/head";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import FileUnlockAndView from "@/components/Files/FileUnlockAndView";
import ExternalLayout from "@/components/Common/ExternalLayout";
import { APP_NAME, APP_URL } from "@/lib/constant";
import { formatBytes } from "@/lib/helpers";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;

  let file: FileDto | null = null;
  try {
    const res = await fetch(`${APP_URL}/api/files/${slug}`, {
      cache: "no-store",
      headers: {
        "x-no-audit": "1",
        "x-audit-source": "metadata",
      },
    });
    if (res.ok) file = (await res.json()) as FileDto;
  } catch {}

  const sizeText = ` I just wasted ${formatBytes(
    file && file.size ? file.size : 0
  )} to show you this.`;
  const isLocked = !file || !file.isPublic || Boolean(file.hasPassword);
  const ogImage = isLocked
    ? `${APP_URL}/images/lock.jpg`
    : `${APP_URL}/x/${slug}`;

  const ownerUsername = file?.ownerUsername;
  const ownerDisplay = file?.ownerDisplayName || ownerUsername;
  const siteName = ownerDisplay ? `${ownerDisplay} on ${APP_NAME}` : APP_NAME;

  return {
    ...defaultMetadata,
    title: sizeText,
    description: `View a shared file on ${APP_NAME}.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/v/${slug}` },
    openGraph: {
      title: sizeText,
      siteName: siteName,
      description: `View a shared file on ${APP_NAME}.`,
      url: `${APP_URL}/v/${slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: isLocked ? "Locked file preview" : `${slug} preview`,
        },
      ],
    },
    twitter: {
      title: `${sizeText}`,
      description: `View a shared file on ${APP_NAME}.`,
      card: "summary_large_image",
      images: [ogImage],
      creator: "@sleepyiconical",
      site: "@sleepyiconical",
    },
  };
}

type FileDto = {
  id: string;
  slug: string;
  originalName: string;
  mimeType: string;
  size: number;
  description: string | null;
  createdAt: string;
  isPublic: boolean;
  tags: string[];
  folderId: string | null;
  hasPassword?: boolean;
  password?: string;
  userId?: string;
  ownerUsername?: string | null;
  ownerDisplayName?: string | null;
};

type FileFetch = {
  data: FileDto | null;
  status: number;
};

async function getFile(slug: string): Promise<FileFetch> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (!host) return { data: null, status: 500 };

    const base = `${proto}://${host}`;
    const cookieHeader = (await cookies()).toString();
    const res = await fetch(`${base}/api/files/${slug}`, {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });

    if (!res.ok) return { data: null, status: res.status };

    const data = (await res.json()) as FileDto;
    return { data, status: 200 };
  } catch {
    return { data: null, status: 500 };
  }
}

export default async function ViewFilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { data: file, status } = await getFile(resolvedParams.slug);

  if (status === 404) {
    return (
      <ExternalLayout>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-2">File not found</h1>
          <p className="text-muted-foreground">
            This link may be incorrect or the file was deleted.
          </p>
        </div>
      </ExternalLayout>
    );
  }

  if (status === 403) {
    return (
      <ExternalLayout>
        <FileUnlockAndView slug={resolvedParams.slug} initialStatus={403} />
      </ExternalLayout>
    );
  }

  if (!file) notFound();

  return (
    <ExternalLayout>
      <FileUnlockAndView
        slug={resolvedParams.slug}
        initialStatus={status}
        initialFile={file}
      />
    </ExternalLayout>
  );
}
