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

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderActions } from "./FoldersActions";
import { IconFolder } from "@tabler/icons-react";
import PageLayout from "@/components/Common/PageLayout";
import { formatBytes } from "@/lib/helpers";

type FolderItem = {
  id: string;
  name: string;
  fileCount: number;
  totalSize: number;
};

export default function FoldersClient() {
  const [items, setItems] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const dq = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/folders", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load folders");
      const json = (await res.json()) as FolderItem[];
      setItems(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || e.isComposing;
      if (isTyping) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openCreateDialog() {
    setCreateError(null);
    setCreateName("");
    setOpenCreate(true);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const name = createName.trim();
      if (!name) throw new Error("Folder name is required");
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch();
        throw new Error(err?.message || "Failed to create folder");
      }
      setOpenCreate(false);
      await load();
    } catch (e) {
      setCreateError((e as Error)?.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    const q = dq.trim().toLowerCase();
    if (!q) return items;
    return items.filter((f) => f.name.toLowerCase().includes(q));
  }, [items, dq]);

  return (
    <PageLayout
      title="Folders"
      subtitle="Browse files by folder. Click a folder to view its contents."
      headerActions={
        <Button onClick={openCreateDialog} size="sm" variant="default">
          + New Folder
        </Button>
      }
      toolbar={
        <Input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search folders"
          className="w-full"
        />
      }
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No folders found.</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No folders match “{query}”.
        </div>
      ) : (
        <div className="grid gap-2 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="rounded-lg border p-4 bg-muted/30 hover:bg-muted/60 transition flex justify-between"
            >
              <div className="flex flex-col justify-center">
                <Link
                  href={`/folders/${encodeURIComponent(f.id)}`}
                  className="flex gap-1 items-center text-xl font-medium truncate hover:underline"
                >
                  {f.name}
                  <IconFolder size={20} />
                </Link>
                <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    {f.fileCount} file{f.fileCount === 1 ? "" : "s"}
                  </span>
                  <span>{formatBytes(f.totalSize)}</span>
                </div>
              </div>
              {f.id !== "unfiled" && (
                <div className="flex items-center gap-2">
                  <FolderActions
                    folderId={f.id}
                    folderName={f.name}
                    className="flex-col"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
            <DialogDescription>Choose a short, clear name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="create-name">Folder name</Label>
            <Input
              id="create-name"
              placeholder="e.g. Invoices"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
