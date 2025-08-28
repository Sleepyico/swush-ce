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

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ClientFileActions from "@/components/Files/ClientFileActions";
import { AudioWaveform } from "@/components/Files/AudioWaveform";
import { PDFViewer } from "@/components/Files/PDFViewer";
import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export type FileDto = {
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
};

type Props = {
  slug: string;
  initialStatus: number;
  initialFile?: FileDto | null;
};

export default function FileUnlockAndView({
  slug,
  initialStatus,
  initialFile,
}: Props) {
  const [file, setFile] = useState<FileDto | null>(initialFile ?? null);
  const [open, setOpen] = useState(initialStatus === 403);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewUrl = file
    ? password
      ? `/v/${file.slug}?p=${password}`
      : `/v/${file.slug}`
    : "";
  const rawUrl = file
    ? password
      ? `/x/${file.slug}?p=${password}`
      : `/x/${file.slug}`
    : "";
  const downloadName = file?.originalName ?? "";

  async function tryUnlock(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/files/${encodeURIComponent(slug)}?p=${encodeURIComponent(
          password
        )}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );
      if (!res.ok) {
        const data = await res.json().catch();
        setError(data?.message || "Invalid or missing password");
        setOpen(true);
        return;
      }
      const data = (await res.json()) as FileDto;
      setFile(data);
      setOpen(false);
    } catch (err) {
      setError((err as Error)?.message || "Something went wrong");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  if (!file) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-xl border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">This file is locked</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enter the password to view.
          </p>
          <Button onClick={() => setOpen(true)}>Unlock</Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter password</DialogTitle>
              <DialogDescription>
                This file is protected. Provide the password to unlock.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={tryUnlock} className="grid gap-3">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Checking…" : "Unlock"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const handleTogglePublic = async () => {
    try {
      const next = !file.isPublic;
      const res = await fetch(`/api/files/${encodeURIComponent(file.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (res.ok) {
        setFile({ ...file, isPublic: next });
      } else {
        toast.error("Uh uh uhhh, you are not the owner!");
      }
    } catch {
      // Ignore please >.<
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-xl border shadow-sm p-4 bg-secondary">
        <div
          className="bg-secondary cursor-pointer"
          onClick={handleTogglePublic}
        >
          {!file.isPublic ? (
            <div className="mb-3 flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-1 text-xs font-medium">
                <IconLock size={14} /> Private — only viewed with access
              </span>
            </div>
          ) : (
            <div className="mb-3 flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2.5 py-1 text-xs font-medium">
                <IconLockOpen size={14} /> Public — anyone can view
              </span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-semibold mb-2 text-center">
          {file.originalName}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          {Math.round(file.size / 1024)} KB · {file.mimeType}
        </p>

        <div className="flex justify-center mb-6">
          {file.mimeType.startsWith("image/") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rawUrl}
              alt={file.originalName}
              className="max-h-[70vh] w-auto rounded-lg border"
            />
          )}

          {file.mimeType.startsWith("audio/") && (
            <AudioWaveform src={rawUrl} isPublic={file.isPublic} />
          )}

          {file.mimeType.startsWith("video/") && (
            <video controls className="w-full rounded-lg max-h-[70vh]">
              <source src={rawUrl} type={file.mimeType} />
            </video>
          )}

          {file.mimeType === "application/pdf" && (
            <div className="w-full">
              <PDFViewer src={rawUrl} fileName={downloadName} />
            </div>
          )}

          {(file.mimeType.startsWith("text/") ||
            file.mimeType === "application/json" ||
            file.mimeType === "application/xml" ||
            file.mimeType === "application/javascript" ||
            /\.txt$/i.test(file.originalName)) && (
            <iframe
              src={rawUrl}
              title={downloadName}
              className="w-full h-[70vh] rounded-lg border"
            />
          )}

          {!/^(image|audio|video|text)\//.test(file.mimeType) &&
            file.mimeType !== "application/pdf" && (
              <a
                href={rawUrl}
                className="underline text-primary hover:text-primary/80"
              >
                Open file
              </a>
            )}
        </div>

        <div className="flex justify-center">
          <ClientFileActions
            viewUrl={viewUrl}
            rawUrl={rawUrl}
            downloadName={downloadName}
            password={password}
            mime={file.mimeType}
          />
        </div>
      </div>
    </div>
  );
}
