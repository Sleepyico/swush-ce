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

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Upload } from "@/types";
import { toast } from "sonner";
import { splitFilename } from "@/lib/helpers";

type Props = {
  file: Upload;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: (f: Upload) => void;
};

export function FileRenameDialog({
  file,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const [base, setBase] = useState("");
  const [ext, setExt] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    const { base, ext } = splitFilename(file.originalName);
    setBase(base);
    setExt(ext);
    setSlug(file.slug ?? "");
    setDescription(file.description ?? "");
  }, [open, file]);

  const keyFor = (f: Upload) => (f.slug ? String(f.slug) : f.id);

  async function handleSave() {
    const payload: {
      originalName?: string;
      newSlug?: string;
      description?: string | null;
    } = {};

    const trimmedBase = base.trim();
    if (!trimmedBase) {
      toast.warning("Name cannot be empty");
      return;
    }
    const newName = `${trimmedBase}${ext}`;
    if (newName !== file.originalName) payload.originalName = newName;

    const trimmedSlug = slug.trim();

    if (trimmedSlug !== (file.slug ?? "")) {
      if (trimmedSlug) payload.newSlug = trimmedSlug;
    }

    const trimmedDesc = description.trim();
    const currentDesc = file.description ?? "";
    if (trimmedDesc !== currentDesc) {
      payload.description = trimmedDesc.length ? trimmedDesc : null;
    }

    if (
      !payload.originalName &&
      !payload.newSlug &&
      payload.description === undefined
    ) {
      onOpenChange(false);
      return;
    }

    const res = await fetch(`/api/files/${keyFor(file)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      toast.error(msg || "Failed to update");
      return;
    }

    const updated: Upload = {
      ...file,
      originalName: payload.originalName ?? file.originalName,
      slug: payload.newSlug ?? file.slug,
      description:
        payload.description !== undefined
          ? payload.description
          : file.description,
    };
    onUpdated(updated);
    toast.success("Updated");
    onOpenChange(false);
  }

  async function handleClearVanity() {
    const res = await fetch(`/api/files/${keyFor(file)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newSlug: "" }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      toast.error(msg || "Failed to clear vanity");
      return;
    }
    const json = await res.json();
    if (json.file) {
      onUpdated(json.file);
      setSlug(json.file.slug ?? "");
    }
    toast.success("Vanity cleared");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename & Vanity</DialogTitle>
          <DialogDescription>
            Change the file name (extension locked) and optional vanity slug.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <label htmlFor="rename" className="text-xs text-muted-foreground">
            File name
          </label>
          <div className="flex min-h-10 items-center rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <input
              id="rename"
              value={base}
              onChange={(e) => setBase(e.target.value.split(".")[0])}
              className="flex-1 bg-transparent outline-none"
              placeholder="New name"
            />
            {ext && (
              <span className="ml-1 select-none text-muted-foreground">
                {ext}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Current: <code>{file.originalName}</code>
          </span>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="vanity" className="text-xs text-muted-foreground">
            Vanity slug (a–z, 0–9, -, _)
          </label>
          <Input
            id="vanity"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. my-awesome-file"
          />
          {file.slug ? (
            <span className="text-[11px] text-muted-foreground">
              Current: <code>/v/{file.slug}</code>
            </span>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="desc" className="text-xs text-muted-foreground">
            Description
          </label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a short description…"
            className="min-h-[84px]"
          />
          <span className="text-[11px] text-muted-foreground">
            Optional. This helps search and context.
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClearVanity}>
            Clear vanity
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
