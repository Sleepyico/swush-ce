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

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Upload } from "@/types";
import {
  IconCloudUp,
  IconRefresh,
  IconFolder,
  IconTag,
  IconLayoutBoardSplitFilled,
} from "@tabler/icons-react";
import { folderNameOf, normalize, tagsOf } from "@/lib/helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import PageLayout from "../Common/PageLayout";
import { useFilteredFiles } from "./FilteredFiles";
import { useLocalStorageBoolean } from "@/hooks/use-local-storage";
import TagFilter from "./TagFilter";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import FileCard from "./FileCard";
import { PaginationFooter } from "../Shared/PaginationFooter";
import { usePagination } from "@/hooks/use-pagination";
import { AuthUser } from "@/lib/auth/auth";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { toast } from "sonner";
import { Music2, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardWrapperProps {
  user: AuthUser;
  userFiles: Upload[];
}

export default function VaultClient({
  user,
  userFiles,
}: DashboardWrapperProps) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [items, setItems] = useState(userFiles);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [hidePreviews, setHidePreviews] = useLocalStorageBoolean(
    "hidePreviews",
    false
  );
  const [galleryView, setGalleryView] = useLocalStorageBoolean(
    "vault.galleryView",
    false
  );

  const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const searchParams = useSearchParams();
  const focusIdParam = searchParams.get("focusId");
  const initialQ = searchParams.get("q");
  const initialFolder = searchParams.get("folder");
  const initialTag = searchParams.get("tag");
  const initialFav = searchParams.get("favorite");
  const initialPage = Number(searchParams.get("page") || "1");
  const initialPageSize = Number(searchParams.get("pageSize") || "");
  const initialGallery = searchParams.get("gallery");
  const didInitFromUrl = useRef(false);

  useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    if (initialQ) setQuery(initialQ);
    if (initialFolder) setSelectedFolder(initialFolder);
    if (initialTag) setSelectedTags([initialTag]);
    if (initialFav === "1") setShowFavorites(true);
    if (initialGallery === "1") setGalleryView(true);
    if (initialPageSize && PAGE_SIZE_OPTIONS.includes(initialPageSize)) {
      setPageSize(initialPageSize);
    }
    if (!Number.isNaN(initialPage) && initialPage > 0) {
      setPage(initialPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    selectedIds,
    isSelected,
    toggleOne,
    togglePage,
    clear,
    count,
    performBulk,
  } = useBulkSelect();
  const selectedCount = count;
  const clearSelection = clear;

  const toggleAllOnPage = () => togglePage(paginatedItems.map((f) => f.id));

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/files");
      const data = await res.json();
      setItems((prev) => {
        if (!Array.isArray(data)) return prev;
        const byId = new Map(prev.map((f) => [f.id, f]));
        for (const incoming of data) {
          const existing = byId.get(incoming.id);
          byId.set(
            incoming.id,
            existing ? { ...existing, ...incoming } : incoming
          );
        }
        const merged = Array.from(byId.values());
        merged.sort((a, b) => {
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bd - ad;
        });
        return merged;
      });
    } finally {
      setRefreshing(false);
    }
  }

  const availableFolders = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((f) => folderNameOf(f))
            .filter((v): v is string => !!v)
            .map((v) => v.trim())
        )
      ).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .flatMap((f) => tagsOf(f))
            .map((t) => normalize(t))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const filtered = useFilteredFiles(items, {
    query: debouncedQuery,
    folder: selectedFolder,
    tags: selectedTags,
    favorites: showFavorites,
  });

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filtered,
    pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [
    debouncedQuery,
    selectedFolder,
    selectedTags,
    showFavorites,
    pageSize,
    setPage,
  ]);

  useEffect(() => {
    if (!focusIdParam || filtered.length === 0) return;
    const idx = filtered.findIndex((x) => x.id === focusIdParam);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / pageSize) + 1;
      if (targetPage !== page) setPage(targetPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIdParam, filtered.length, pageSize]);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusIdParam) return;
    const el = cardRefs.current[focusIdParam];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashId(focusIdParam);
      const t = setTimeout(() => setFlashId(null), 1600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIdParam, paginatedItems.map((x) => x.id).join(","), page]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQuery.trim()) sp.set("q", debouncedQuery.trim());
    if (selectedFolder) sp.set("folder", selectedFolder);
    if (selectedTags[0]) sp.set("tag", selectedTags[0]);
    if (showFavorites) sp.set("favorite", "1");
    if (galleryView) sp.set("gallery", "1");
    if (pageSize) sp.set("pageSize", String(pageSize));
    if (page > 1) sp.set("page", String(page));
    if (focusIdParam) sp.set("focusId", focusIdParam);
    router.replace(`/vault${sp.toString() ? `?${sp.toString()}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQuery,
    selectedFolder,
    selectedTags,
    showFavorites,
    pageSize,
    page,
    galleryView,
  ]);

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const toDelete = [...selectedIds];

    try {
      const { ok, fail } = await performBulk(toDelete, async (id) =>
        fetch(`/api/files/${id}`, { method: "DELETE" })
      );
      if (fail.length) {
        toast.error(`Deleted ${ok}/${toDelete.length}.`, {
          description: fail[0]?.error || "Some deletions failed.",
        });
      } else {
        toast.success(`Deleted ${ok} file${ok === 1 ? "" : "s"}.`);
      }
    } finally {
      clearSelection();
      await handleRefresh();
    }
  };

  const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");
  const isAudio = (mime?: string | null) => !!mime && mime.startsWith("audio/");
  const isVideo = (mime?: string | null) => !!mime && mime.startsWith("video/");

  return (
    <PageLayout
      title={`Welcome back, ${
        user?.displayName ? user.displayName : user.username
      } 👋`}
      subtitle="Here’s your stash."
      headerActions={
        <>
          <Button
            variant={hidePreviews ? "default" : "outline"}
            onClick={() => {
              setHidePreviews((v) => !v);
            }}
            className="whitespace-nowrap"
          >
            {hidePreviews ? "Show Previews" : "Hide Previews"}
          </Button>
        </>
      }
      toolbar={
        <>
          <Input
            placeholder="Search by name, description, type or slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
          />

          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((v) => !v)}
            className="whitespace-nowrap"
            aria-expanded={showFilters}
            aria-controls="vault-filters"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>

          <Button
            variant={refreshing ? "ghost" : "outline"}
            disabled={refreshing}
            onClick={handleRefresh}
            className="gap-2"
          >
            <IconRefresh
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>

          <Button className="gap-2" onClick={() => router.push("/upload")}>
            <IconCloudUp className="h-4 w-4" />
            Upload
          </Button>
        </>
      }
    >
      {showFilters && (
        <div
          id="vault-filters"
          key="vault-filters"
          style={{ transformOrigin: "top" }}
          className="overflow-hidden bg-secondary p-3 rounded-lg"
          aria-hidden={!showFilters}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedFolder ?? "__all__"}
              onValueChange={(val) =>
                setSelectedFolder(val === "__all__" ? null : val)
              }
            >
              <SelectTrigger className="min-w-[160px]">
                <SelectValue placeholder="Folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All folders</SelectItem>
                {availableFolders.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <TagFilter
              availableTags={availableTags}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
            />

            <Button
              variant={showFavorites ? "default" : "outline"}
              onClick={() => setShowFavorites((prev) => !prev)}
            >
              {showFavorites ? "Showing Favorites" : "Show Favorites"}
            </Button>

            <Select
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="rounded-md text-sm px-2 min-w-[120px]">
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} items
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={galleryView ? "default" : "outline"}
              onClick={() => setGalleryView((v) => !v)}
              className="whitespace-nowrap"
            >
              <IconLayoutBoardSplitFilled className="h-4 w-4" />
              {galleryView ? "Gallery View On" : "Gallery View Off"}
            </Button>
          </div>
        </div>
      )}

      {(selectedFolder || selectedTags.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center mb-2">
          {selectedFolder && (
            <Badge className="gap-1 bg-primary">
              <IconFolder size={12} /> {selectedFolder}
            </Badge>
          )}
          {selectedTags.map((t) => (
            <Badge key={t} variant="outline" className="gap-1">
              <IconTag size={12} /> {t}
            </Badge>
          ))}
        </div>
      )}

      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span>
            <strong>{selectedCount}</strong> selected on this page
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => toggleAllOnPage()}
              disabled={paginatedItems.length === 0}
              size="sm"
            >
              Select Page ({paginatedItems.length})
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selectedCount} selected file
                    {selectedCount === 1 ? "" : "s"}?
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {paginatedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground text-center">
            No files found matching your criteria.
          </p>
        </div>
      )}

      {galleryView ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 [column-fill:balance] max-w-[90vw]">
          {paginatedItems.map((file) => (
            <div
              key={file.id}
              ref={(el) => {
                cardRefs.current[file.id] = el;
              }}
              onClick={() => router.push(`/v/${file.slug}`)}
              className={cn(
                "mb-4 break-inside-avoid overflow-hidden rounded-md cursor-pointer",
                flashId === file.id &&
                  "ring-2 ring-primary shadow-[0_0_0_4px_var(--primary-a9)]"
              )}
            >
              {isImage(file.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/x/${encodeURIComponent(file.slug)}`}
                  alt={file.originalName}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              ) : isVideo(file.mimeType) ? (
                <div className="flex w-full items-center justify-center bg-muted aspect-video">
                  <video src={`/x/${encodeURIComponent(file.slug)}`} />
                </div>
              ) : isAudio(file.mimeType) ? (
                <div className="flex w-full items-center justify-center bg-muted aspect-video">
                  <Music2 className="h-10 w-10 opacity-70" />
                </div>
              ) : (
                <div className="flex w-full items-center justify-center bg-muted aspect-video">
                  <FileIcon className="h-10 w-10 opacity-70" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {paginatedItems.map((file, idx) => (
            <div
              key={file.id}
              ref={(el) => {
                cardRefs.current[file.id] = el;
              }}
              className={cn(
                flashId === file.id && "ring-2 ring-primary rounded-md "
              )}
            >
              <FileCard
                file={file}
                index={idx}
                selected={isSelected(file.id)}
                onToggle={() => toggleOne(file.id)}
                enableCardSelection={selectedCount > 0}
                hidePreviews={hidePreviews}
                setItems={setItems}
              />
            </div>
          ))}
        </div>
      )}

      <PaginationFooter
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </PageLayout>
  );
}
