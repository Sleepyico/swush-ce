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

import { db } from "@/db/client";
import { files, folders } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { getUser } from "@/lib/auth/auth";
import { FolderActions } from "@/components/Files/Folders/FoldersActions";
import PageLayout from "@/components/Common/PageLayout";
import FolderGridClient from "@/components/Files/Folders/FoldersGridClient";
import { Button } from "@/components/ui/button";

type Params = Promise<{ name: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { name } = await params;
  const key = decodeURIComponent(name || "");
  const isUnfiled = key === "unfiled";

  if (isUnfiled) return { title: "Folder: (Unfiled)" };

  const folder = await db.query.folders.findFirst({
    where: eq(folders.id, key),
    columns: { name: true },
  });
  return { title: `Folder: ${folder?.name ?? "Unknown"}` };
}

export default async function FolderDetailPage({ params }: { params: Params }) {
  const { name } = await params;

  const user = await getUser();
  const key = decodeURIComponent(name || "");
  const isUnfiled = key === "unfiled";

  let headerName = "(Unfiled)";
  if (!isUnfiled) {
    const folder = await db.query.folders.findFirst({
      where: eq(folders.id, key),
      columns: { name: true },
    });
    headerName = folder?.name ?? "Unknown";
  }

  const rows = await db.query.files.findMany({
    where: isUnfiled
      ? and(isNull(files.folderId), eq(files.userId, user?.id ?? ""))
      : and(eq(files.folderId, key), eq(files.userId, user?.id ?? "")),
    orderBy: (f, { desc }) => [desc(f.createdAt)],
    columns: {
      id: true,
      slug: true,
      originalName: true,
      size: true,
      createdAt: true,
      mimeType: true,
    },
  });

  return (
    <PageLayout
      title={`Folder: ${headerName}`}
      subtitle={`${rows.length} file${rows.length === 1 ? "" : "s"}`}
      headerActionsClassName="flex flex-col md:flex-row items-start gap-3"
      headerActions={
        <div className="flex gap-2 items-center justify-between w-full">
          <Button href="/folders" variant="outline">
            ← Back to folders
          </Button>
          <div className="flex items-center gap-3">
            {!isUnfiled && (
              <FolderActions
                folderId={key}
                folderName={headerName}
                disabled={isUnfiled}
              />
            )}
          </div>
        </div>
      }
    >
      <FolderGridClient items={rows} />
    </PageLayout>
  );
}
