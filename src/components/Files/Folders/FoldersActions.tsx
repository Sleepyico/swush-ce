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

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Too long"),
});

type Props = {
  folderId: string;
  folderName: string;
  disabled?: boolean;
  className?: string;
};

export function FolderActions({
  folderId,
  folderName,
  disabled,
  className,
}: Props) {
  const router = useRouter();
  const [openRename, setOpenRename] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: folderName },
    values: { name: folderName },
  });

  async function renameFolder(values: z.infer<typeof schema>) {
    try {
      const res = await fetch("/api/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId, name: values.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to rename folder");
      }
      toast.success("Folder renamed", { description: `→ ${values.name}` });
      setOpenRename(false);
      router.refresh();
    } catch (err) {
      toast.error("Rename failed", { description: (err as Error).message });
    }
  }

  async function deleteFolder() {
    try {
      const res = await fetch("/api/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete folder");
      }
      toast.success("Folder deleted", {
        description: "Files moved to (Unfiled)",
      });
      setOpenDelete(false);
      router.push("/folders");
      router.refresh();
    } catch (err) {
      toast.error("Delete failed", { description: (err as Error).message });
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Dialog
        open={openRename}
        onOpenChange={(o) => {
          setOpenRename(o);
          reset({ name: folderName });
        }}
      >
        <DialogTrigger asChild>
          <Button variant="secondary" disabled={disabled} className="w-20">
            Rename
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>Choose a clear, short name.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-3" onSubmit={handleSubmit(renameFolder)}>
            <div className="grid gap-2">
              <Label htmlFor="name">Folder name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. Invoices"
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenRename(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={disabled} className="w-20">
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription>
              This will remove the folder. Its files will be moved to{" "}
              <strong>(Unfiled)</strong>.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteFolder}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
