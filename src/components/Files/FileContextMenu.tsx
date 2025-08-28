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

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Upload } from "@/types";
import { toast } from "sonner";
import { FileRenameDialog } from "../Dialogs/FileRenameDialog";
import { FileTagsFoldersDialog } from "../Dialogs/FileTagsFoldersDialog";
import { ConfirmDialog } from "../Dialogs/ConfirmDialog";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  IconAdjustments,
  IconStarFilled,
  IconStarOff,
  IconTrash,
  IconEdit,
  IconTags,
  IconEye,
  IconEyeOff,
  IconLink,
  IconCode,
  IconDownload,
  IconLock,
  IconLockOpen,
} from "@tabler/icons-react";
import { useConfig } from "@/hooks/use-config";

interface FileContextMenuProps {
  file: Upload;
  onFileUpdated: (updatedFile: Upload) => void;
  onFileDeleted: (id: string) => void;
}

export function FileContextMenu({
  file,
  onFileUpdated,
  onFileDeleted,
}: FileContextMenuProps) {
  const router = useRouter();
  const config = useConfig();
  const [renameOpen, setRenameOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function toggleVisibility() {
    const res = await fetch(`/api/files/${file.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !file.isPublic }),
    });
    if (res.ok) {
      const updated = { ...file, isPublic: !file.isPublic };
      onFileUpdated(updated);
      toast.success(`File is now ${updated.isPublic ? "Public" : "Private"}`);
    } else {
      toast.error("Failed to update visibility");
    }
  }

  async function toggleFavorite() {
    const res = await fetch(`/api/files/${file.slug}/favorite`, {
      method: "PATCH",
    });
    if (res.ok) {
      const updated = { ...file, isFavorite: !file.isFavorite };
      onFileUpdated(updated);
      toast.success(
        updated.isFavorite ? "Added to Favorites" : "Removed from Favorites"
      );
    } else {
      toast.error("Failed to update favorites");
    }
  }

  async function deleteFile() {
    const res = await fetch(`/api/files/${file.slug}`, { method: "DELETE" });
    if (res.ok) {
      onFileDeleted(file.id);
      toast.success("File deleted");
    } else {
      toast.error("Failed to delete file");
    }
  }

  async function savePassword() {
    setPasswordSaving(true);
    const res = await fetch(`/api/files/${file.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordValue }),
    });
    setPasswordSaving(false);
    if (res.ok) {
      setPasswordOpen(false);
      setPasswordValue("");
      toast.success("Password updated");
    } else {
      const data = await res.json().catch();
      toast.error(data?.message || "Failed to update password");
    }
  }

  async function removePassword() {
    const res = await fetch(`/api/files/${file.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: null }),
    });
    if (res.ok) {
      toast.success("Password removed");
    } else {
      const data = await res.json().catch();
      toast.error(data?.message || "Failed to remove password");
    }
  }

  function copyToClipboard(text: string, successMessage: string) {
    if (!navigator.clipboard) {
      toast.error("Clipboard API not supported");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(successMessage, {
      description: text,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconAdjustments className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <IconEdit className="mr-2 h-4 w-4 text-blue-500" />
            Rename / Vanity / Description
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTagsOpen(true)}>
            <IconTags className="mr-2 h-4 w-4 text-amber-500" />
            Edit Tags / Folders
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleVisibility}>
            {file.isPublic ? (
              <>
                <IconEyeOff className="mr-2 h-4 w-4 text-red-500" />
                Make Private
              </>
            ) : (
              <>
                <IconEye className="mr-2 h-4 w-4 text-green-500" />
                Make Public
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleFavorite}>
            {file.isFavorite ? (
              <>
                <IconStarOff className="mr-2 h-4 w-4 text-yellow-500" />
                Remove from Favorites
              </>
            ) : (
              <>
                <IconStarFilled className="mr-2 h-4 w-4 text-yellow-500" />
                Add to Favorites
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <IconLock className="mr-2 h-4 w-4 text-rose-500" />
            Set / Change Password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={removePassword}>
            <IconLockOpen className="mr-2 h-4 w-4 text-emerald-500" />
            Remove Password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/v/${file.slug}`)}>
            <IconEye className="mr-2 h-4 w-4 text-cyan-500" />
            View File
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              copyToClipboard(
                `${config?.appUrl}/v/${file.slug}`,
                "Copied View URL to clipboard"
              )
            }
          >
            <IconLink className="mr-2 h-4 w-4 text-indigo-500" />
            Copy View URL
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              copyToClipboard(
                `${config?.appUrl}/x/${file.slug}`,
                "Copied Raw URL to clipboard"
              )
            }
          >
            <IconCode className="mr-2 h-4 w-4 text-purple-500" />
            Copy Raw URL
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              copyToClipboard(
                `${config?.appUrl}/x/${file.slug}.${file.mimeType.split("/")[1]}`,
                "Copied Raw URL with .ext"
              )
            }
          >
            <IconCode className="mr-2 h-4 w-4 text-purple-500" />
            Copied Raw URL with .ext
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-red-500 focus:text-red-500"
          >
            <IconTrash className="mr-2 h-4 w-4 text-red-500" /> Delete
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const a = document.createElement("a");
              a.href = `${config?.appUrl}/x/${file.slug}`;
              a.download = file.originalName;
              document.body.appendChild(a);
              a.click();
              a.remove();
            }}
          >
            <IconDownload className="mr-2 h-4 w-4 text-emerald-500" />
            Download File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FileRenameDialog
        file={file}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onUpdated={onFileUpdated}
      />
      <FileTagsFoldersDialog
        file={file}
        open={tagsOpen}
        onOpenChange={setTagsOpen}
        onUpdated={onFileUpdated}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete File"
        description={`Are you sure you want to delete ${file.originalName}? This cannot be undone.`}
        onConfirm={deleteFile}
      />

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Protect with password</DialogTitle>
            <DialogDescription>
              Set a password to require viewers to unlock before accessing this
              file. Leave empty to clear.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePassword} disabled={passwordSaving}>
              {passwordSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
