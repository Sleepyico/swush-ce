"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FilePreview from "@/components/Vault/FilePreview";
import { formatBytes } from "@/lib/helpers";
import { Music2, File as FileIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocalStorageString } from "@/hooks/use-local-storage";

export type FoldersGridItem = {
  id: string;
  slug: string;
  originalName: string;
  size: number;
  createdAt: Date | string | null;
  mimeType?: string | null;
  description?: string | null;
};

type Props = {
  items: FoldersGridItem[];
};

export default function FoldersGridClient({ items }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const dq = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [viewMode, setViewMode] = useLocalStorageString(
    "swush.viewMode",
    "grid"
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = dq.trim().toLowerCase();
    if (!q) return items;
    return items.filter((f) => f.originalName.toLowerCase().includes(q));
  }, [items, dq]);

  const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");
  const isAudio = (mime?: string | null) => !!mime && mime.startsWith("audio/");

  if (!items || items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No files in this folder.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files"
          className="w-full"
        />
        <Button
          type="button"
          variant={viewMode === "gallery" ? "default" : "outline"}
          onClick={() =>
            setViewMode((m) => (m === "grid" ? "gallery" : "grid"))
          }
        >
          {viewMode === "gallery" ? "Grid view" : "Gallery view"}
        </Button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No files match “{query}”.
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          {filtered.map((f, i) => (
            <Card
              key={f.id}
              className="overflow-hidden p-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <FilePreview
                src={`/x/${encodeURIComponent(f.slug)}`}
                mime={f.mimeType ?? ""}
                name={f.originalName}
              />

              <CardHeader className="flex justify-between p-1">
                <CardTitle
                  className="truncate text-base"
                  title={f.originalName}
                >
                  {f.originalName}
                </CardTitle>
                <span>{formatBytes(f.size)}</span>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center justify-between p-1">
                <span>
                  {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                </span>
                {f.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {f.description}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex items-center justify-between p-1">
                <span className="truncate text-xs">
                  {f.mimeType || "unknown"}
                </span>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/v/${encodeURIComponent(f.slug)}`}>View</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/x/${encodeURIComponent(f.slug)}`}>Raw</Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-4 [column-fill:balance]">
          {filtered.map((f, i) => (
            <Card
              key={f.id}
              onClick={() => router.push(`/v/${f.slug}`)}
              className="overflow-hidden p-0 mb-4 break-inside-avoid animate-fade-in-up rounded-sm cursor-pointer"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {isImage(f.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/x/${encodeURIComponent(f.slug)}`}
                  alt={f.originalName}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              ) : isAudio(f.mimeType) ? (
                <div className="flex w-full items-center justify-center bg-muted aspect-video">
                  <Music2 className="h-10 w-10 opacity-70" />
                </div>
              ) : (
                <div className="flex w-full items-center justify-center bg-muted aspect-video">
                  <FileIcon className="h-10 w-10 opacity-70" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
