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

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Upload } from "@/types";
import { X } from "lucide-react";
import { toast } from "sonner";
import { normalize } from "@/lib/helpers";

type FolderMeta = { id: string; name: string };
type TagMeta = { id: string; name: string };

type Props = {
  file: Upload;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: (f: Upload) => void;
};

function formatTag(s: string) {
  const n = normalize(s);
  return n ? n[0] + n.slice(1) : "";
}

function normalizeFolder(s: unknown): string {
  const v = typeof s === "string" ? s : s == null ? "" : String(s);
  return v.trim().replace(/\s+/g, " ").toLowerCase();
}
function capitalizeFirst(s: string): string {
  const n = normalizeFolder(s);
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
}

function filterStartsWith(options: string[], q: string, limit = 6) {
  const qq = q.trim().toLowerCase();
  if (!qq) return options.slice(0, limit);
  const starts = options.filter((o) => o.toLowerCase().startsWith(qq));
  const rest = options.filter(
    (o) => !o.toLowerCase().startsWith(qq) && o.toLowerCase().includes(qq)
  );
  return [...starts, ...rest].slice(0, limit);
}

export function FileTagsFoldersDialog({
  file,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const [folders, setFolders] = useState<FolderMeta[]>([]);
  const [tags, setTags] = useState<TagMeta[]>([]);

  const [folderName, setFolderName] = useState("");
  const [folderFocused, setFolderFocused] = useState(false);

  const [chips, setChips] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [tagsFocused, setTagsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const keyFor = (f: Upload) => (f.slug ? String(f.slug) : f.id);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [fRes, tRes] = await Promise.all([
          fetch("/api/folders", { cache: "no-store" }),
          fetch("/api/tags", { cache: "no-store" }),
        ]);
        const fData = (await fRes.json()) as FolderMeta[];
        const tData = (await tRes.json()) as TagMeta[];
        setFolders(Array.isArray(fData) ? fData : []);
        setTags(Array.isArray(tData) ? tData : []);
      } catch {}
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const maybeFolder =
      (file as unknown as { folder?: { name?: string | null } | null }).folder
        ?.name ??
      (file as unknown as { folderName?: string | null }).folderName ??
      "";
    setFolderName(capitalizeFirst(maybeFolder || ""));

    const tRaw = (
      (file as unknown as { tags?: (string | { name: string })[] }).tags ?? []
    ).map((t) => (typeof t === "string" ? t : t?.name ?? ""));
    const uniq = Array.from(new Set(tRaw.map(normalize))).filter(Boolean);
    setChips(uniq);
  }, [open, file]);

  const tagMap = useMemo(
    () => new Map(tags.map((t) => [normalize(t.name), t.id])),
    [tags]
  );

  function commitDraft() {
    const v = normalize(draft);
    if (!v) return;
    setChips((prev) => {
      const s = new Set(prev.map(normalize));
      s.add(v);
      return Array.from(s);
    });
    setDraft("");
  }

  async function save() {
    let folderId: string | null = null;
    const fnameDisplay = capitalizeFirst(folderName);
    const fnameNorm = normalizeFolder(folderName);
    if (fnameNorm) {
      const match = folders.find((f) => normalizeFolder(f.name) === fnameNorm);
      if (match) {
        folderId = match.id;
      } else {
        const res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fnameDisplay }),
        });
        if (res.ok) {
          const created = (await res.json()) as FolderMeta;
          folderId = created.id;
          setFolders((prev) => [...prev, created]);
        }
      }
    }

    const desired = new Set(chips.map(normalize));
    const current = new Set(
      ((file as unknown as { tags?: (string | { name: string })[] }).tags ?? [])
        .map((t) => (typeof t === "string" ? t : t?.name ?? ""))
        .map(normalize)
        .filter(Boolean)
    );

    const toAddNames = [...desired].filter((n) => !current.has(n));
    const toRemoveNames = [...current].filter((n) => !desired.has(n));

    const newNames: string[] = [];
    const addIds: string[] = [];
    for (const name of toAddNames) {
      const id = tagMap.get(name);
      if (id) addIds.push(id);
      else newNames.push(name);
    }
    if (newNames.length) {
      const created: TagMeta[] = [];
      for (const nm of newNames) {
        const r = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nm }),
        });
        if (r.ok) {
          const tag = (await r.json()) as TagMeta;
          created.push(tag);
        }
      }
      if (created.length) {
        created.forEach((t) => tagMap.set(normalize(t.name), t.id));
        addIds.push(...created.map((t) => t.id));
        setTags((prev) => [...prev, ...created]);
      }
    }

    const removeIds = toRemoveNames
      .map((n) => tagMap.get(n))
      .filter((x): x is string => typeof x === "string");

    const body: {
      folderId?: string | null;
      addTagIds?: string[];
      removeTagIds?: string[];
    } = {};

    if (typeof folderId === "string" || (!fnameNorm && folderName)) {
      body.folderId = folderId ?? null;
    }
    if (addIds.length) body.addTagIds = addIds;
    if (removeIds.length) body.removeTagIds = removeIds;

    if (!("folderId" in body) && !addIds.length && !removeIds.length) {
      onOpenChange(false);
      return;
    }

    const res = await fetch(`/api/files/${keyFor(file)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      toast.error(msg || "Failed to update");
      return;
    }

    const updated: Upload &
      Partial<{
        folder: { name: string | null } | null;
        tags: { name: string }[];
      }> = {
      ...file,

      ...(fnameNorm ? { folder: { name: fnameDisplay } } : { folder: null }),

      tags: [...desired].map((n) => ({ name: n })),
    };

    onUpdated(updated as Upload);
    toast.success("Updated");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Tags & Folder</DialogTitle>
          <DialogDescription>
            Organize your file with a folder and tags. Tags are case‑insensitive
            and deduped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <label htmlFor="folder" className="text-xs text-muted-foreground">
            Folder
          </label>
          <div className="relative">
            <Input
              id="folder"
              value={folderName}
              onChange={(e) => setFolderName(capitalizeFirst(e.target.value))}
              onFocus={() => setFolderFocused(true)}
              onBlur={() => {
                setFolderName((prev) => capitalizeFirst(prev));
                setFolderFocused(false);
              }}
              placeholder="e.g. Invoices / 2025"
            />
            {folderFocused && folderName.trim() && folders.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-sm">
                {(() => {
                  const uniqDisplay = Array.from(
                    new Map(
                      folders.map((f) => [
                        normalizeFolder(f.name),
                        capitalizeFirst(f.name),
                      ])
                    ).values()
                  );
                  return filterStartsWith(uniqDisplay, folderName)
                    .filter((n) => n && n !== folderName.trim())
                    .map((name) => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFolderName(name);
                          setFolderFocused(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted rounded-md transition"
                      >
                        {name}
                      </button>
                    ));
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="tags" className="text-xs text-muted-foreground">
            Tags
          </label>
          <div
            className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            onClick={() => inputRef.current?.focus()}
            role="textbox"
            aria-labelledby="tags"
          >
            {chips.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-full">
                {formatTag(t)}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-background/50 -mr-1"
                  onClick={() =>
                    setChips((prev) => prev.filter((x) => x !== t))
                  }
                  aria-label={`Remove ${t}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setTagsFocused(true)}
              onBlur={() => setTagsFocused(false)}
              placeholder={chips.length ? "Add more…" : "e.g. work"}
              className="min-w-[8ch] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                  e.preventDefault();
                  commitDraft();
                } else if (e.key === "Backspace" && !draft && chips.length) {
                  setChips((prev) => prev.slice(0, -1));
                }
              }}
            />
          </div>

          {tagsFocused && draft.trim() && tags.length > 0 && (
            <div className="relative">
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-sm">
                {filterStartsWith(
                  tags
                    .map((t) => t.name)
                    .filter((n) => {
                      const nn = normalize(n);
                      return (
                        !chips.map(normalize).includes(nn) &&
                        nn !== normalize(draft)
                      );
                    }),
                  draft
                ).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const nv = normalize(name);
                      setChips((prev) => {
                        const s = new Set(prev.map(normalize));
                        s.add(nv);
                        return Array.from(s);
                      });
                      setDraft("");
                      setTagsFocused(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-muted rounded-md transition"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <span className="text-[11px] text-muted-foreground">
            Press <kbd>Enter</kbd> or comma to add. Missing tags will be created
            automatically.
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
