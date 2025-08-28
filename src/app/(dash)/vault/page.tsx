/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http:

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { db } from "@/db/client";
import { files } from "@/db/schema";

import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/auth";
import { defaultMetadata } from "@/lib/head";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import VaultClient from "@/components/Vault/VaultClient";

export const metadata: Metadata = {
  ...defaultMetadata,
  title: "Vault",
};

export default async function VaultServer() {
  const user = await getUser();

  if (!user) {
    redirect("/login?next=/vault");
  }

  const userFiles = (
    await db.query.files.findMany({
      where: eq(files.userId, user.id),
      orderBy: (f, { desc }) => [desc(f.createdAt)],
      with: {
        folder: true,
        tags: { with: { tag: true } },
      },
    })
  ).map((f) => ({
    id: f.id,
    userId: f.userId,
    originalName: f.originalName,
    customName: f.originalName,
    description: f.description ?? null,
    mimeType: f.mimeType,
    size: f.size,
    slug: f.slug,
    isPublic: Boolean(f.isPublic),
    createdAt: f.createdAt ?? new Date(0),
    isFavorite: Boolean(f.isFavorite),

    folder: f.folder ? { name: f.folder.name } : null,
    tags: (f.tags ?? [])
      .map((ft) => ft.tag?.name)
      .filter((n): n is string => !!n)
      .map((name) => ({ name })),
  }));

  return <VaultClient user={user} userFiles={userFiles} />;
}
