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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IconFolder, IconTag, IconStarFilled } from "@tabler/icons-react";
import { Upload } from "@/types";
import {
  folderNameOf,
  formatBytes,
  formatTagLabel,
  tagsOf,
} from "@/lib/helpers";
import VisibilityDialog from "../Dialogs/VisibilityDialog";
import { FileContextMenu } from "../Files/FileContextMenu";
import FilePreview from "./FilePreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useMemo, useRef } from "react";

interface VaultFileCardProps {
  file: Upload;
  index: number;
  selected?: boolean;
  enableCardSelection?: boolean;
  onToggle?: () => void;
  hidePreviews: boolean;
  setItems: React.Dispatch<React.SetStateAction<Upload[]>>;
}

export default function FileCard({
  file,
  index,
  selected = false,
  enableCardSelection = false,
  onToggle,
  hidePreviews,
  setItems,
}: VaultFileCardProps) {
  const viewUrl = `/v/${file.slug}`;
  const rawUrl = `/x/${file.slug}`;
  const date = file.createdAt ? new Date(file.createdAt) : null;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgZoomed, setImgZoomed] = useState(false);
  const isImage = useMemo(
    () => file.mimeType?.startsWith("image/"),
    [file.mimeType]
  );
  const isVideo = useMemo(
    () => file.mimeType?.startsWith("video/"),
    [file.mimeType]
  );
  const lightboxContainerRef = useRef<HTMLDivElement | null>(null);

  const openLightbox = (e?: React.MouseEvent) => {
    if (enableCardSelection) return;
    e?.stopPropagation();
    setLightboxOpen(true);
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    setImgZoomed(false);
  };

  return (
    <Card
      className={`group relative transition-all gap-3 animate-fade-in-up h-full ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={enableCardSelection ? onToggle : undefined}
    >
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="flex-1 min-w-0 truncate">
            <Link
              href={viewUrl}
              className="hover:underline flex"
              onClick={(e) => {
                if (enableCardSelection && onToggle) {
                  e.preventDefault();
                  onToggle();
                }
              }}
            >
              {file.originalName}
              {file.isFavorite && (
                <IconStarFilled
                  size={16}
                  className="text-yellow-400 flex-shrink-0 ml-2"
                  title="Favorited"
                />
              )}
            </Link>
          </CardTitle>

          <VisibilityDialog file={file} setItems={setItems} />

          <FileContextMenu
            file={file}
            onFileUpdated={(updated) =>
              setItems((prev) =>
                prev.map((f) =>
                  f.id === updated.id ? { ...f, ...updated } : f
                )
              )
            }
            onFileDeleted={(id) =>
              setItems((prev) => prev.filter((f) => f.id !== id))
            }
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)} • {file.mimeType}
          {date ? ` • ${date.toLocaleDateString()}` : ""}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 h-full justify-between">
        <div>
          <div
            role={isImage || isVideo ? "button" : undefined}
            tabIndex={isImage || isVideo ? 0 : undefined}
            onClick={isImage || isVideo ? openLightbox : undefined}
            onKeyDown={(e) => {
              if (!(isImage || isVideo)) return;
              if (e.key === "Enter" || e.key === " ") openLightbox();
            }}
            className={isImage || isVideo ? "cursor-zoom-in" : undefined}
          >
            <FilePreview
              mime={file.mimeType}
              src={rawUrl}
              name={file.originalName}
              isPublic={file.isPublic}
              hide={hidePreviews}
            />
          </div>
        </div>

        {file.description ? (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {file.description}
          </p>
        ) : null}

        {(() => {
          const folder = folderNameOf(file);
          const tagList = tagsOf(file);
          if (!folder && tagList.length === 0) return null;
          return (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {folder && (
                <Badge className="gap-1 bg-primary">
                  <IconFolder size={12} /> {folder}
                </Badge>
              )}
              {tagList.map((t) => (
                <Badge key={t} variant="outline" className="gap-1">
                  <IconTag size={12} /> {formatTagLabel(t)}
                </Badge>
              ))}
            </div>
          );
        })()}
        <div className="absolute left-2 top-2 z-10 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="rounded-full"
            aria-label="Select file"
          />
        </div>
      </CardContent>

      <Dialog
        open={lightboxOpen}
        onOpenChange={(o) => (o ? setLightboxOpen(true) : closeLightbox())}
      >
        <DialogContent className="min-h-[85vh] sm:max-w-[90vw] max-w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-sm truncate" title={file.originalName}>
              {file.originalName}
            </DialogTitle>
          </DialogHeader>

          {isImage && (
            <div
              ref={lightboxContainerRef}
              className="h-[85vh] overflow-auto bg-background flex items-center justify-center"
              onClick={() => setImgZoomed((z) => !z)}
              title={imgZoomed ? "Click to zoom out" : "Click to zoom in"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rawUrl}
                alt={file.originalName}
                className={
                  imgZoomed
                    ? "transition-transform duration-200 cursor-zoom-out select-none min-w-[320px]"
                    : "max-w-[92vw] max-h-[80vh] min-w-[320px] object-contain transition-transform duration-200 cursor-zoom-in select-none"
                }
                style={
                  imgZoomed
                    ? {
                        transform: "scale(2)",
                        transformOrigin: "center center",
                      }
                    : undefined
                }
                draggable={false}
              />
            </div>
          )}

          {isVideo && (
            <div className="bg-background flex items-center justify-center cursor-zoom-in">
              <video
                src={rawUrl}
                controls
                playsInline
                className="max-w-[92vw] max-h-[75vh]"
              />
            </div>
          )}

          {!isImage && !isVideo && (
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              No preview available.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
