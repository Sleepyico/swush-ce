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

import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FolderMeta, TagMeta, UploadWrapper } from "@/types";
import Image from "next/image";

import {
  IconEdit,
  IconFileFilled,
  IconFileUpload,
  IconMusic,
  IconVideoFilled,
  IconX,
} from "@tabler/icons-react";
import {
  FolderInputWithSuggestions,
  formatTag,
  normalizeTag,
  TagChipsInput,
} from "@/components/Upload/FolderInputWithSuggestions";
import { formatBytes, splitFilename } from "@/lib/helpers";
import PageLayout from "@/components/Common/PageLayout";
import { APP_URL } from "@/lib/constant";

type Summary = {
  resources: {
    files: { used: number; limit: number; remaining: number | typeof Infinity };
    shortLink: {
      used: number;
      limit: number;
      remaining: number | typeof Infinity;
    };
  };
  storage: {
    maxStorageMb: number | typeof Infinity;
    usedStorageMb: number;
    remainingStorageMb: number | typeof Infinity;
  };
  dailyQuota: {
    dailyQuotaMb: number | typeof Infinity;
    usedTodayMb: number;
    remainingTodayMb: number | typeof Infinity;
  };
  perUpload: {
    maxUploadMb: number;
    maxFilesPerUpload: number;
  };
};

function useApplySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [maxUploadMb, setMaxUploadMb] = useState<number | null>(null);
  const [maxFilesPerUpload, setMaxFilesPerUpload] = useState<number | null>(
    null
  );
  const [remainingQuotaMb, setRemainingQuotaMb] = useState<number | null>(null);
  const [filesRemaining, setFilesRemaining] = useState<number | null>(null);
  const [maxStorageMb, setMaxStorageMb] = useState<number | null>(null);
  const [remainingStorageMb, setRemainingStorageMb] = useState<number | null>(
    null
  );
  const [usedTodayBytes, setUsedTodayBytes] = useState<number>(0);
  const [usedStorageBytes, setUsedStorageBytes] = useState<number>(0);

  const apply = (data: Summary) => {
    setSummary(data);

    setMaxUploadMb(data.perUpload.maxUploadMb ?? null);
    setMaxFilesPerUpload(data.perUpload.maxFilesPerUpload ?? null);

    const remainingToday =
      typeof data.dailyQuota.remainingTodayMb === "number"
        ? data.dailyQuota.remainingTodayMb
        : null;
    setRemainingQuotaMb(remainingToday);

    const filesRem =
      data.resources.files.remaining === Infinity
        ? null
        : (data.resources.files.remaining as number);
    setFilesRemaining(filesRem);

    const maxStore =
      typeof data.storage.maxStorageMb === "number"
        ? data.storage.maxStorageMb
        : null;
    setMaxStorageMb(maxStore);

    const remStore =
      typeof data.storage.remainingStorageMb === "number"
        ? data.storage.remainingStorageMb
        : null;
    setRemainingStorageMb(remStore);

    setUsedTodayBytes(
      Math.max(0, Math.floor((data.dailyQuota.usedTodayMb || 0) * 1_000_000))
    );
    setUsedStorageBytes(
      Math.max(0, Math.floor((data.storage.usedStorageMb || 0) * 1_000_000))
    );
  };

  return {
    summary,
    setSummary,
    maxUploadMb,
    setMaxUploadMb,
    maxFilesPerUpload,
    setMaxFilesPerUpload,
    remainingQuotaMb,
    setRemainingQuotaMb,
    filesRemaining,
    setFilesRemaining,
    maxStorageMb,
    setMaxStorageMb,
    remainingStorageMb,
    setRemainingStorageMb,
    usedTodayBytes,
    setUsedTodayBytes,
    usedStorageBytes,
    setUsedStorageBytes,
    apply,
  };
}

export default function UploadClient() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<
    (UploadWrapper & {
      progress?: number;
      uploaded?: boolean;
      error?: string;
      shareUrl?: string;
      folderName?: string;
      tags?: string[];
      vanitySlug?: string;
    })[]
  >([]);
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [vanitySlug, setVanitySlug] = useState("");
  const [lockedExt, setLockedExt] = useState("");
  const {
    maxUploadMb,
    maxFilesPerUpload,
    remainingQuotaMb,
    filesRemaining,
    maxStorageMb,
    remainingStorageMb,
    usedTodayBytes,
    usedStorageBytes,
    apply: applySummary,
  } = useApplySummary();

  const toMb = (bytes: number) => Math.round((bytes || 0) / 1_000_000);
  const formatMbWhole = (mb: number) => `${Math.round(mb)} MB`;

  const effectiveRemainingStorageMb = useMemo(() => {
    if (typeof remainingStorageMb === "number") return remainingStorageMb;
    if (typeof maxStorageMb === "number") {
      const usedMb = toMb(usedStorageBytes);
      return Math.max(0, maxStorageMb - usedMb);
    }
    return null;
  }, [remainingStorageMb, maxStorageMb, usedStorageBytes]);

  const [isUploading, setIsUploading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMakePublic, setBulkMakePublic] = useState(false);
  const [bulkExpireAt, setBulkExpireAt] = useState<string>("");
  const [bulkFolder, setBulkFolder] = useState("");
  const [bulkFolderFocused, setBulkFolderFocused] = useState(false);

  const [bulkTagsChips, setBulkTagsChips] = useState<string[]>([]);
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [bulkTagsFocused, setBulkTagsFocused] = useState(false);

  const [folders, setFolders] = useState<FolderMeta[]>([]);
  const [tags, setTags] = useState<TagMeta[]>([]);
  const [folderFocused, setFolderFocused] = useState(false);

  const [tagsChips, setTagsChips] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagsFocused, setTagsFocused] = useState(false);

  const previewUrls = useRef<Map<File, string>>(new Map());
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const lastPasteAtRef = useRef<number>(0);

  function makePastedName(mime: string) {
    const ext = mime.split("/")[1] || "png";
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    return `pasted-${ts}.${ext}`;
  }

  function extractImageFilesFromClipboard(
    ev: ClipboardEvent | React.ClipboardEvent
  ): File[] {
    const dt =
      "clipboardData" in ev
        ? ev.clipboardData
        : (ev as ClipboardEvent).clipboardData;
    if (!dt) return [];

    const out: File[] = [];
    const items = Array.from(dt.items || []);
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          const named =
            f.name && f.name.trim().length > 0
              ? f
              : new File([f], makePastedName(f.type), {
                  type: f.type,
                  lastModified: Date.now(),
                });
          out.push(named);
        }
      }
    }

    if (out.length === 0 && dt.files && dt.files.length) {
      for (const f of Array.from(dt.files)) {
        if (f.type.startsWith("image/")) {
          const named =
            f.name && f.name.trim().length > 0
              ? f
              : new File([f], makePastedName(f.type), {
                  type: f.type,
                  lastModified: Date.now(),
                });
          out.push(named);
        }
      }
    }

    return out;
  }

  const handlePasteReact = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastPasteAtRef.current < 200) return;
    const imgs = extractImageFilesFromClipboard(e);
    if (imgs.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    lastPasteAtRef.current = now;
    addFilesToQueue(imgs);
    toast.success(
      `${imgs.length} image${imgs.length > 1 ? "s" : ""} added from clipboard`
    );
  };

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        dropZoneRef.current &&
        target &&
        dropZoneRef.current.contains(target)
      ) {
        return;
      }

      const tag = (target?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (isTyping) return;

      const now = Date.now();
      if (now - lastPasteAtRef.current < 200) return;

      const imgs = extractImageFilesFromClipboard(e);
      if (imgs.length === 0) return;

      e.preventDefault();
      lastPasteAtRef.current = now;
      addFilesToQueue(imgs);
      toast.success(
        `${imgs.length} image${imgs.length > 1 ? "s" : ""} added from clipboard`
      );
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFilesToQueue = (incoming: File[]) => {
    if (incoming.length === 0) return;

    let filtered = incoming;
    if (typeof maxUploadMb === "number" && maxUploadMb > 0) {
      const capBytes = maxUploadMb * 1_000_000;
      const rejected = incoming.filter((f) => f.size > capBytes);
      filtered = incoming.filter((f) => f.size <= capBytes);

      if (rejected.length > 0) {
        const names = rejected
          .map((f) => `${f.name} (${formatBytes(f.size)})`)
          .join(", ");
        toast.error(
          `These files exceed the ${maxUploadMb} MB limit and were skipped: ${names}`
        );
      }
    }

    if (typeof maxFilesPerUpload === "number" && maxFilesPerUpload > 0) {
      const currentPending = files.filter((f) => !f.uploaded).length;
      const remainingSlots = Math.max(0, maxFilesPerUpload - currentPending);

      if (remainingSlots === 0) {
        toast.error(
          `You already have ${currentPending} file(s) in queue. Max is ${maxFilesPerUpload}.`
        );
        return;
      }

      if (filtered.length > remainingSlots) {
        toast.error(
          `Only ${remainingSlots} more file(s) allowed (max ${maxFilesPerUpload} per upload). Extra files were skipped.`
        );
        filtered = filtered.slice(0, remainingSlots);
      }
    }

    if (filtered.length === 0) return;

    const wrappedFiles = filtered.map((file) => {
      previewUrls.current.set(file, URL.createObjectURL(file));
      return {
        file,
        customName: file.name,
        description: "",
        isPublic: false,
        folderName: "",
        tags: [],
        vanitySlug: "",
        progress: 0,
      };
    });

    setFiles((prev) => [...prev, ...wrappedFiles]);
  };

  useEffect(() => {
    if (editingFileIndex === null) return;

    const f = files[editingFileIndex];
    if (!f) return;

    setOpen(true);

    const { base, ext } = splitFilename(f.customName || f.file.name);
    setCustomName(base);
    setLockedExt(ext);
    setDescription(f.description);
    setIsPublic(f.isPublic);
    setFolderName(f.folderName || "");
    setVanitySlug(f.vanitySlug || "");
    setTagsChips(Array.from(new Set((f.tags || []).map(normalizeTag))));
  }, [editingFileIndex, files]);

  useEffect(() => {
    (async () => {
      try {
        const [fRes, tRes] = await Promise.all([
          fetch("/api/folders", { cache: "no-store" }),
          fetch("/api/tags", { cache: "no-store" }),
        ]);
        const fData: FolderMeta[] = fRes.ok ? await fRes.json() : [];
        const tData: TagMeta[] = tRes.ok ? await tRes.json() : [];
        setFolders(Array.isArray(fData) ? fData : []);
        setTags(Array.isArray(tData) ? tData : []);
      } catch (err) {
        console.error("Failed to load folders/tags", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/summary", { cache: "no-store" });
        if (!res.ok) return;
        const data: Summary = await res.json();
        applySummary(data);
      } catch (e) {
        console.error("Failed to load user summary", e);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    addFilesToQueue(Array.from(selected));
  };

  const handleUpload = async () => {
    const pendingIndexes = files
      .map((f, i) => (!f.uploaded ? i : -1))
      .filter((i) => i !== -1);

    if (pendingIndexes.length === 0) return;

    setIsUploading(true);

    setFiles((prev) => {
      const next = [...prev];
      for (const i of pendingIndexes) {
        if (next[i]) next[i] = { ...next[i], progress: 0, error: undefined };
      }
      return next;
    });

    await Promise.all(
      pendingIndexes.map(
        (idx) =>
          new Promise<void>((resolve) => {
            const current = files[idx];
            if (!current) return resolve();

            const formData = new FormData();
            formData.append("name", current.customName);
            formData.append("description", current.description);
            formData.append("isPublic", String(current.isPublic));

            const folderNameNorm = (current.folderName || "")
              .trim()
              .toLowerCase();
            const folderMatch = folderNameNorm
              ? folders.find(
                  (f) => f.name.trim().toLowerCase() === folderNameNorm
                )
              : undefined;
            if (folderMatch) {
              formData.append("folderId", folderMatch.id);
            } else {
              formData.append("folderName", current.folderName || "");
            }

            const tagMap = new Map(
              tags.map((t) => [t.name.trim().toLowerCase(), t.id])
            );
            const inputTagNames = (current.tags ?? [])
              .map((t) => normalizeTag(t))
              .filter(Boolean);
            const tagIds: string[] = [];
            const newTags: string[] = [];
            for (const name of inputTagNames) {
              const key = name.toLowerCase();
              const id = tagMap.get(key);
              if (id) tagIds.push(id);
              else newTags.push(name);
            }
            formData.append("tagIds", JSON.stringify(tagIds));
            formData.append("newTags", newTags.join(","));

            formData.append("slug", current.vanitySlug || "");
            formData.append("file", current.file);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload");

            xhr.upload.onprogress = (event) => {
              const percent = event.lengthComputable
                ? Math.round((event.loaded / event.total) * 100)
                : 0;
              setFiles((prev) => {
                const next = [...prev];
                if (next[idx]) next[idx] = { ...next[idx], progress: percent };
                return next;
              });
            };

            xhr.onload = async () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  setFiles((prev) => {
                    const next = [...prev];
                    const shareUrl = (slug: string) =>
                      `${APP_URL || ""}/x/${encodeURIComponent(slug)}`;
                    const shareUrlValue = result?.slug
                      ? shareUrl(result.slug)
                      : next[idx]?.shareUrl;
                    if (next[idx])
                      next[idx] = {
                        ...next[idx],
                        ...result,
                        folderName:
                          result.folder ?? next[idx]?.folderName ?? "",
                        tags: Array.isArray(result.tags)
                          ? result.tags
                          : next[idx]?.tags ?? [],
                        shareUrl: shareUrlValue,
                        progress: 100,
                        uploaded: true,
                        error: undefined,
                      };
                    return next;
                  });
                  toast.success(
                    `"${current.customName}" uploaded successfully!`
                  );
                  try {
                    const summaryRes = await fetch("/api/user/summary", {
                      cache: "no-store",
                    });
                    if (summaryRes.ok) {
                      const data: Summary = await summaryRes.json();
                      applySummary(data);
                    }
                  } catch {}
                } catch (e) {
                  console.error("Failed to parse upload response:", e);
                  setFiles((prev) => {
                    const next = [...prev];
                    if (next[idx])
                      next[idx] = {
                        ...next[idx],
                        error: "Invalid server response",
                      };
                    return next;
                  });
                  toast.error(
                    `"${current.customName}" uploaded but returned an invalid response.`
                  );
                }
              } else {
                let message = xhr.statusText || "Upload failed";
                try {
                  const parsed = JSON.parse(xhr.responseText);
                  const apiMsg = parsed?.error || parsed?.message;
                  if (typeof apiMsg === "string" && apiMsg.trim()) {
                    message = apiMsg;
                  }
                } catch {}
                setFiles((prev) => {
                  const next = [...prev];
                  if (next[idx]) next[idx] = { ...next[idx], error: message };
                  return next;
                });
                toast.error(
                  `Failed to upload "${current.customName}": ${message}`
                );
              }
              resolve();
            };

            xhr.onerror = () => {
              console.error("Upload failed", xhr.statusText);
              setFiles((prev) => {
                const next = [...prev];
                if (next[idx])
                  next[idx] = {
                    ...next[idx],
                    error: xhr.statusText || "Network error",
                  };
                return next;
              });
              toast.error(
                `Network error while uploading "${current.customName}"`
              );
              resolve();
            };

            xhr.send(formData);
          })
      )
    );

    setIsUploading(false);
    setOpen(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const list = e.dataTransfer?.files;
    if (!list || list.length === 0) return;
    addFilesToQueue(Array.from(list));
  };

  return (
    <PageLayout
      title="Upload Files"
      subtitle="Upload your files to the server"
      toolbar={
        files.length > 0 && (
          <div className="flex gap-2 md:items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkOpen(true)}
              disabled={isUploading || files.length === 0}
            >
              Bulk Update
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                for (const url of previewUrls.current.values()) {
                  URL.revokeObjectURL(url);
                }
                previewUrls.current.clear();
                setFiles([]);
                toast.success("All files cleared.");
              }}
            >
              Clear Files
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                handleUpload();
              }}
              disabled={
                isUploading ||
                files.length === 0 ||
                files.every((f) => f.uploaded)
              }
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )
      }
    >
      <section className="w-full mx-auto min-h-96">
        <div
          className="flex flex-col items-center justify-center gap-4 h-60 rounded-lg border-2 border-dashed border-muted p-6 text-muted-foreground cursor-pointer hover:border-primary transition"
          onClick={() => document.getElementById("fileInput")?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePasteReact}
          tabIndex={0}
          ref={dropZoneRef}
        >
          <input
            id="fileInput"
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
          <IconFileUpload className="w-12 h-12 text-muted-foreground animate-pulse" />
          <p className="text-center text-sm">
            Drag and drop your files here or click to upload
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
            {typeof maxUploadMb === "number" && maxUploadMb > 0 && (
              <span>
                Max per file:{" "}
                <span className="font-medium">
                  {formatMbWhole(maxUploadMb)}
                </span>
              </span>
            )}

            {typeof maxFilesPerUpload === "number" && maxFilesPerUpload > 0 && (
              <span>
                Max files per upload:{" "}
                <span className="font-medium">{maxFilesPerUpload}</span>
              </span>
            )}

            {typeof remainingQuotaMb === "number" && remainingQuotaMb >= 0 && (
              <span>
                Remaining today:{" "}
                <span className="font-medium">
                  {formatMbWhole(remainingQuotaMb)}
                </span>
              </span>
            )}

            {filesRemaining !== undefined && filesRemaining !== null && (
              <span>
                Files left:{" "}
                <span className="font-medium">{filesRemaining}</span>
              </span>
            )}
            {filesRemaining === null && (
              <span>
                Files left: <span className="font-medium">∞</span>
              </span>
            )}
            {typeof maxStorageMb === "number" ? (
              <span>
                Storage:{" "}
                <span className="font-medium">
                  {Math.round(effectiveRemainingStorageMb ?? 0)} /{" "}
                  {Math.round(maxStorageMb)} MB
                </span>
              </span>
            ) : (
              <span>
                Storage left: <span className="font-medium">∞</span>
              </span>
            )}
            {typeof usedTodayBytes === "number" && usedTodayBytes >= 0 && (
              <span>
                Today used:{" "}
                <span className="font-medium">{toMb(usedTodayBytes)} MB</span>
              </span>
            )}
            {typeof usedStorageBytes === "number" && usedStorageBytes >= 0 && (
              <span>
                Stored:{" "}
                <span className="font-medium">{toMb(usedStorageBytes)} MB</span>
              </span>
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {files.map((f, index) => (
              <div
                key={index}
                className="grid grid-cols-3 justify-between items-center border border-muted rounded-md bg-muted text-muted-foreground px-4 py-2 relative h-20"
              >
                <div className="flex items-center gap-3 col-span-3">
                  <div className="w-12 h-12 rounded bg-muted overflow-hidden flex items-center justify-center">
                    {f.file.type.startsWith("image/") ? (
                      <Image
                        src={previewUrls.current.get(f.file) || ""}
                        alt="Preview"
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : f.file.type.startsWith("audio/") ? (
                      <span className="text-lg">
                        <IconMusic className="h-6 w-6" />
                      </span>
                    ) : f.file.type.startsWith("video/") ? (
                      <span className="text-lg">
                        <IconVideoFilled className="h-6 w-6" />
                      </span>
                    ) : (
                      <span className="text-lg">
                        <IconFileFilled className="h-6 w-6" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground/90 break-all">
                          {f.customName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(f.file.size)}
                        </span>
                        {(f.folderName || (f.tags && f.tags.length > 0)) && (
                          <span className="text-[11px] text-muted-foreground/80">
                            {f.folderName ? `📁 ${f.folderName}` : ""}{" "}
                            {f.tags && f.tags.length > 0
                              ? `🏷️ ${f.tags.map(formatTag).join(", ")}`
                              : ""}
                          </span>
                        )}
                      </div>
                      {f.uploaded && (
                        <span className="text-xs rounded bg-emerald-500/15 text-emerald-400 px-2 py-0.5">
                          Uploaded
                        </span>
                      )}
                      {f.error && (
                        <span className="text-xs rounded bg-red-500/15 text-red-400 px-2 py-0.5">
                          Failed
                        </span>
                      )}
                    </div>

                    {isUploading &&
                      !f.uploaded &&
                      typeof f.progress === "number" &&
                      f.progress < 100 && (
                        <div className="absolute inset-0 z-10 rounded-md backdrop-blur-sm bg-background/60 flex flex-col">
                          <div className="w-full h-1">
                            <div
                              className="h-full bg-primary transition-all rounded-t-xl"
                              style={{
                                width: `${Math.min(f.progress ?? 0, 100)}%`,
                              }}
                            />
                          </div>
                          <div className="flex-1 grid place-items-center">
                            <span className="text-xs text-foreground/80">
                              {Math.min(f.progress ?? 0, 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    {f.uploaded && (
                      <div className="absolute inset-0 z-10 rounded-md backdrop-blur-sm bg-emerald-500/20 flex items-center justify-center gap-3">
                        <span className="text-emerald-300 text-sm font-medium">
                          Uploaded
                        </span>
                        {f.shareUrl && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await navigator.clipboard.writeText(
                                  f.shareUrl!
                                );
                              } catch {}
                            }}
                          >
                            Copy link
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute right-1 top-1.5 flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingFileIndex(null);
                      requestAnimationFrame(() => setEditingFileIndex(index));
                    }}
                    aria-label="Edit"
                    disabled={isUploading || f.uploaded}
                  >
                    <IconEdit size={24} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const url = previewUrls.current.get(f.file);
                      if (url) URL.revokeObjectURL(url);
                      previewUrls.current.delete(f.file);
                      setFiles((prev) =>
                        prev.filter((_, idx) => idx !== index)
                      );
                      toast.success(`"${f.customName}" removed from queue.`);
                    }}
                    aria-label="Remove"
                    disabled={isUploading || f.uploaded}
                  >
                    <IconX className="text-red-600" size={24} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle>Edit a file</DialogTitle>
            <DialogDescription>
              Configure this file{"'"}s settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {editingFileIndex !== null && files[editingFileIndex] && (
              <>
                {files[editingFileIndex].file.type.startsWith("image/") && (
                  <Image
                    src={
                      previewUrls.current.get(files[editingFileIndex].file) ||
                      ""
                    }
                    alt="Preview"
                    width={200}
                    height={200}
                    className="rounded object-cover"
                  />
                )}

                <div className="grid gap-2">
                  <Label htmlFor="customName">Rename (optional)</Label>
                  <div className="grid grid-cols-4 gap-1">
                    <Input
                      id="customName"
                      value={customName}
                      onChange={(e) => {
                        const next = e.target.value ?? "";
                        const safeBase = next.split(".")[0];
                        setCustomName(safeBase);
                      }}
                      placeholder="Custom filename"
                      className="col-span-3 bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                    {lockedExt && (
                      <Input
                        value={`${lockedExt}`}
                        disabled
                        className="select-none bg-transparent outline-none text-muted-foreground"
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="vanitySlug">Vanity Slug (optional)</Label>
                  <Input
                    id="vanitySlug"
                    value={vanitySlug}
                    onChange={(e) => setVanitySlug(e.target.value)}
                    placeholder="custom-short-link"
                  />
                  <span className="text-xs text-muted-foreground">
                    Allowed: letters, numbers, dashes, underscores
                  </span>
                </div>

                {files[editingFileIndex].file.type.startsWith("audio/") && (
                  <audio controls className="w-full">
                    <source
                      src={
                        previewUrls.current.get(files[editingFileIndex].file) ||
                        ""
                      }
                      type={files[editingFileIndex].file.type}
                    />
                    Your browser does not support the audio element.
                  </audio>
                )}
                {files[editingFileIndex].file.type.startsWith("video/") && (
                  <video controls className="w-full rounded">
                    <source
                      src={
                        previewUrls.current.get(files[editingFileIndex].file) ||
                        ""
                      }
                      type={files[editingFileIndex].file.type}
                    />
                    Your browser does not support the video tag.
                  </video>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this file?"
                  />
                </div>

                <FolderInputWithSuggestions
                  id="folderName"
                  label="Folder (optional)"
                  value={folderName}
                  onChange={setFolderName}
                  focused={folderFocused}
                  setFocused={setFolderFocused}
                  folders={folders}
                  placeholder="e.g. Invoices / 2025"
                />

                <TagChipsInput
                  id="tags"
                  label="Tags (optional)"
                  chips={tagsChips}
                  setChips={setTagsChips}
                  draft={tagDraft}
                  setDraft={setTagDraft}
                  focused={tagsFocused}
                  setFocused={setTagsFocused}
                  availableTags={tags}
                />

                <div className="flex items-center justify-between">
                  <Label htmlFor="publicSwitch">Public File?</Label>
                  <Switch
                    id="publicSwitch"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => {
                      const updatedFiles = [...files];
                      const currentFile = updatedFiles[editingFileIndex];
                      if (currentFile) {
                        currentFile.customName = `${
                          customName ||
                          splitFilename(
                            currentFile.customName || currentFile.file.name
                          ).base
                        }${lockedExt}`;
                        currentFile.description = description;
                        currentFile.isPublic = isPublic;
                        currentFile.folderName = folderName;
                        currentFile.tags = tagsChips;
                        currentFile.vanitySlug = vanitySlug;
                        setFiles(updatedFiles);
                      }
                      setCustomName("");
                      setDescription("");
                      setIsPublic(false);
                      setFolderName("");
                      setVanitySlug("");
                      setEditingFileIndex(null);
                      setOpen(false);
                      toast.success("File changes saved.");
                    }}
                  >
                    Save
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk update files</DialogTitle>
            <DialogDescription>
              Apply settings to all files currently in your queue.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulkPublic">Make all Public</Label>
              <Switch
                id="bulkPublic"
                checked={bulkMakePublic}
                onCheckedChange={setBulkMakePublic}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bulkExpires">Expire At (optional)</Label>
              <Input
                id="bulkExpires"
                type="datetime-local"
                value={bulkExpireAt}
                onChange={(e) => setBulkExpireAt(e.target.value)}
              />
            </div>

            <FolderInputWithSuggestions
              id="bulkFolder"
              label="Folder (optional)"
              value={bulkFolder}
              onChange={setBulkFolder}
              focused={bulkFolderFocused}
              setFocused={setBulkFolderFocused}
              folders={folders}
              placeholder="e.g. Receipts"
            />

            <TagChipsInput
              id="bulkTags"
              label="Tags"
              chips={bulkTagsChips}
              setChips={setBulkTagsChips}
              draft={bulkTagDraft}
              setDraft={setBulkTagDraft}
              focused={bulkTagsFocused}
              setFocused={setBulkTagsFocused}
              availableTags={tags}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setFiles((prev) => {
                    const bulkList = Array.from(
                      new Set(bulkTagsChips.map(normalizeTag))
                    );

                    return prev.map((f) => {
                      if (f.uploaded) return f;

                      const nextTags =
                        bulkList.length > 0
                          ? Array.from(
                              new Set([
                                ...(f.tags ?? []).map(normalizeTag),
                                ...bulkList,
                              ])
                            )
                          : (f.tags ?? []).map(normalizeTag);

                      return {
                        ...f,
                        isPublic: bulkMakePublic ? true : f.isPublic,
                        folderName: bulkFolder ? bulkFolder : f.folderName,
                        tags: nextTags,
                      };
                    });
                  });
                  setBulkOpen(false);
                  toast.success("Bulk update applied to all pending files.");
                }}
              >
                Apply to All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
