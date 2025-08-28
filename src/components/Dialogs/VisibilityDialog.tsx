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

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Upload } from "@/types";
import { IconLock, IconLockOpen } from "@tabler/icons-react";

export default function VisibilityDialog({
  file,
  setItems,
}: {
  file: Upload;
  setItems: React.Dispatch<React.SetStateAction<Upload[]>>;
}) {
  const keyFor = (f: Upload) => (f.slug ? String(f.slug) : f.id);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          asChild
          variant="ghost"
          className="flex items-center rounded-full p-2 shrink-0"
          aria-label={file.isPublic ? "Make private" : "Make public"}
        >
          {file.isPublic ? (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2.5 py-1 text-xs font-medium">
                <IconLockOpen size={14} /> Public
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-1 text-xs font-medium">
                <IconLock size={14} /> Private
              </span>
            </div>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {file.isPublic
              ? "Make this file private?"
              : "Make this file public?"}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <p className="text-sm text-muted-foreground">
          {file.isPublic
            ? "Only you will be able to view this file."
            : "Anyone with the link will be able to view this file."}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const next = !file.isPublic;
              const res = await fetch(`/api/files/${keyFor(file)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublic: next }),
              });
              if (res.ok) {
                setItems((prev) =>
                  prev.map((f) =>
                    f.id === file.id ? { ...f, isPublic: next } : f
                  )
                );
                toast.success(next ? "Made Public" : "Made Private");
              } else {
                toast.error("Failed to change visibility");
              }
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
