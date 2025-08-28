/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationFooter } from "../Shared/PaginationFooter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { DBShortLink } from "@/db/schema";
import PageLayout from "../Common/PageLayout";
import { shareUrl } from "@/lib/api/helpers";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
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
import {
  IconAlertTriangle,
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconLinkPlus,
  IconLoader,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import PublicBadge from "../Common/PublicBadge";
import FavoriteBadge from "../Common/FavoriteBadge";
import RefreshingTemp from "../Common/RefreshingTemp";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { cn } from "@/lib/utils";

export default function ShortenerClient() {
  const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;
  const [items, setItems] = useState<DBShortLink[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const seq = useRef(0);

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
  const toggleAllOnPage = () => togglePage(paginatedItems.map((x) => x.id));

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const toDelete = [...selectedIds];
    setLoading(true);
    try {
      const { ok, fail } = await performBulk(toDelete, async (id) =>
        fetch(`/api/shorten/${id}`, { method: "DELETE" })
      );
      if (fail.length) {
        toast.error(`Deleted ${ok}/${toDelete.length}.`, {
          description: fail[0]?.error || "Some deletions failed.",
        });
      } else {
        toast.success(`Deleted ${ok} link${ok === 1 ? "" : "s"}.`);
      }
    } finally {
      clearSelection();
      await refresh(q);
      setLoading(false);
    }
  };

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    items,
    pageSize
  );

  const bulkSetVisibility = async (value: boolean) => {
    if (selectedIds.length === 0) return;
    const toUpdate = [...selectedIds];
    setLoading(true);
    try {
      const { ok, fail } = await performBulk(toUpdate, async (id) =>
        fetch(`/api/shorten/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: value }),
        })
      );
      if (fail.length) {
        toast.error(`Updated ${ok}/${toUpdate.length}.`, {
          description: fail[0]?.error || "Some updates failed.",
        });
      } else {
        toast.success(
          `${value ? "Made public" : "Made private"} ${ok} short-link${
            ok === 1 ? "" : "s"
          }.`
        );
      }
    } finally {
      clearSelection();
      await refresh(q);
      setLoading(false);
    }
  };

  const bulkMakePublic = async () => bulkSetVisibility(true);
  const bulkMakePrivate = async () => bulkSetVisibility(false);

  const refresh = async (query?: string) => {
    const thisSeq = ++seq.current;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (query && query.trim()) qs.set("q", query.trim());
      if (showFavoriteOnly) qs.set("favorite", "1");
      if (showPublicOnly) qs.set("public", "1");
      const res = await fetch(
        `/api/shorten${qs.toString() ? `?${qs.toString()}` : ""}`,
        { cache: "no-store" }
      );
      const js = await res.json();
      if (thisSeq !== seq.current) return;
      setItems(js.data ?? []);
    } catch {
      if (thisSeq === seq.current) toast.error("Failed to load");
    } finally {
      if (thisSeq === seq.current) setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    clearSelection();
    const t = setTimeout(() => refresh(q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavoriteOnly, showPublicOnly, q, pageSize, setPage]);

  const fmtDate = (v: string | Date | null | undefined) => {
    if (!v) return "—";
    const d = typeof v === "string" ? new Date(v) : v;
    if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const displayUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== "/" ? u.pathname : "");
    } catch {
      return url;
    }
  };

  const toggleFavorite = async (row: DBShortLink) => {
    try {
      const res = await fetch(`/api/shorten/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !row.isFavorite }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to update favorite");
      toast.success(
        !row.isFavorite ? "Added to favorites" : "Removed from favorites"
      );
      await refresh(q);
    } catch (e) {
      toast.error((e as Error).message || "Failed to update favorite");
    }
  };

  const toggleVisibility = async (row: DBShortLink) => {
    try {
      const res = await fetch(`/api/shorten/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !row.isPublic }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to update visibility");
      toast.success(`Link is now ${!row.isPublic ? "public" : "private"}`);
      await refresh(q);
    } catch (e) {
      toast.error((e as Error).message || "Failed to update visibility");
    }
  };

  return (
    <PageLayout
      title="Short Links"
      subtitle="Create and share your short links"
      toolbar={
        <>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search short links..."
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
            variant={loading ? "ghost" : "outline"}
            onClick={() => refresh()}
            disabled={loading}
          >
            {loading ? (
              <IconLoader className="h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
            {loading ? "Refreshing" : "Refresh"}
          </Button>
          <CreateShortLinkDialog onCreated={() => refresh(q)} />
        </>
      }
    >
      {showFilters && (
        <div
          id="vault-filters"
          key="vault-filters"
          style={{ transformOrigin: "top" }}
          className="overflow-hidden bg-background p-3 rounded-lg"
          aria-hidden={!showFilters}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="rounded-md border text-sm px-2 min-w-[120px]">
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
              variant={showFavoriteOnly ? "default" : "outline"}
              onClick={() => setShowFavoriteOnly((prev) => !prev)}
            >
              {showFavoriteOnly ? "Showing Favorites" : "Show Favorites"}
            </Button>
            <Button
              variant={showPublicOnly ? "default" : "outline"}
              onClick={() => setShowPublicOnly((prev) => !prev)}
            >
              {showPublicOnly ? "Showing Public" : "Show Public"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <RefreshingTemp />
      ) : paginatedItems.length === 0 ? (
        <div className="text-sm text-muted-foreground">No short links yet.</div>
      ) : (
        <div className="p-4 bg-secondary rounded-lg border border-border">
          {selectedCount > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
              <span>
                <strong>{selectedCount}</strong> selected out of {items.length}
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
                <Button variant="outline" size="sm" onClick={bulkMakePublic}>
                  <IconEye /> Make Public
                </Button>
                <Button variant="outline" size="sm" onClick={bulkMakePrivate}>
                  <IconEyeOff /> Make Private
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Remove Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete {selectedCount} selected link
                        {selectedCount === 1 ? "" : "s"}?
                      </AlertDialogTitle>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone.
                      </p>
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

          <Table key={seq.current} className="overflow-hidden">
            <TableHeader>
              <TableRow className="text-muted-foreground">
                <TableHead className="">
                  <Checkbox
                    checked={
                      paginatedItems.length > 0 &&
                      paginatedItems.every((x) => isSelected(x.id))
                    }
                    onCheckedChange={() => toggleAllOnPage()}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead className="w-2/12">Slug</TableHead>
                <TableHead className="w-3/12">Destination</TableHead>
                <TableHead className="w-1/12">Clicks</TableHead>
                <TableHead className="w-2/12">Visibility</TableHead>
                <TableHead className="w-2/12">Created</TableHead>
                <TableHead className="text-right w-2/12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((r, i) => (
                <TableRow
                  key={r.id ?? i}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label={`Select ${r.slug}`}
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs",
                      selectedCount > 0 && "cursor-pointer"
                    )}
                    onClick={
                      selectedCount > 0 ? () => toggleOne(r.id) : undefined
                    }
                  >
                    <div className="flex items-center gap-1">
                      <FavoriteBadge
                        isFavorite={r.isFavorite!}
                        toggleFavorite={() => toggleFavorite(r)}
                      />

                      <span className="truncate max-w-[120px]">{r.slug}</span>
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[20px]">
                    <Link
                      href={r.originalUrl}
                      target="_blank"
                      className="text-primary underline underline-offset-2 break-all line-clamp-1"
                    >
                      {displayUrl(r.originalUrl)}
                    </Link>
                    {r.description ? (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {r.description}
                      </div>
                    ) : null}
                  </TableCell>

                  <TableCell
                    className="cursor-pointer"
                    onClick={() => {
                      if (r.clickCount === r.maxClicks && r.maxClicks) {
                        toast.warning("Max clicks reached", {
                          description:
                            "Your link has reached the maximum number of clicks.",
                        });
                      }
                    }}
                  >
                    <span className="inline-flex gap-1 items-center rounded-md border px-2 py-0.5 text-xs">
                      {r.clickCount ?? 0}
                      {r.clickCount === r.maxClicks && r.maxClicks && (
                        <IconAlertTriangle className="text-yellow-500 h-3 w-3" />
                      )}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PublicBadge
                        isPublic={r.isPublic!}
                        toggleVisibility={() => toggleVisibility(r)}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(r.createdAt)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EditShortLinkDialog row={r} onSaved={() => refresh(q)} />

                      {r.isPublic && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={async () => {
                            const url = shareUrl("s", r.slug);
                            await navigator.clipboard.writeText(url);
                            toast.success("Copied share link");
                          }}
                          aria-label="Copy link"
                        >
                          <IconCopy className="h-4 w-4" />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Short Link
                            </AlertDialogTitle>
                            <p>
                              Are you sure you want to delete this short link?
                            </p>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                const res = await fetch(
                                  `/api/shorten/${r.id}`,
                                  {
                                    method: "DELETE",
                                  }
                                );
                                if (!res.ok) {
                                  const j = await res.json().catch(() => ({}));
                                  toast.error(j?.error || "Delete failed");
                                } else {
                                  toast.success("Deleted");
                                  refresh(q);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

function CreateShortLinkDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [originalUrl, setOriginalUrl] = useState("");
  const [description, setDescription] = useState("");
  const [maxClicks, setMaxClicks] = useState<number | "">("");
  const [expiresAt, setExpiresAt] = useState("");
  const [slug, setSlug] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState("");

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          originalUrl,
          description: description || null,
          maxClicks: maxClicks === "" ? undefined : Number(maxClicks),
          expiresAt: expiresAt || null,
          slug: slug || null,
          isFavorite,
          isPublic,
          password: password || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Create failed");
      toast.success("Short link created");
      setOpen(false);
      onCreated();
      setDescription("");
      setMaxClicks("");
      setExpiresAt("");
      setSlug("");
      setIsPublic(false);
      setPassword("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconLinkPlus className="h-4 w-4" />
          New
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Short link</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 max-h-[70vh] overflow-auto">
          <Label>URL to shorten</Label>
          <Input
            value={originalUrl}
            required
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="https://iconical.dev"
          />

          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="The best guy out there"
          />

          <Label>Max Clicks</Label>
          <Input
            type="number"
            value={maxClicks}
            onChange={(e) =>
              setMaxClicks(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Unlimited"
          />

          <Label>Expires At</Label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />

          <Label>Favorite</Label>
          <Switch checked={isFavorite} onCheckedChange={setIsFavorite} />

          <div className="flex flex-col justify-between gap-2">
            <Label>Public</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            {isPublic && (
              <>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional"
                />
              </>
            )}
          </div>

          <Label>Custom Slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Leave empty to auto-generate"
          />
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditShortLinkDialog({
  row,
  onSaved,
}: {
  row: DBShortLink;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [originalUrl, setOriginalUrl] = useState<string>(row.originalUrl ?? "");
  const [description, setDescription] = useState<string>(row.description ?? "");
  const [slug, setSlug] = useState<string>(row.slug ?? "");
  const [maxClicks, setMaxClicks] = useState<number | "">(row.maxClicks ?? "");
  const [expiresAt, setExpiresAt] = useState<string>(
    row.expiresAt
      ? typeof row.expiresAt === "string"
        ? row.expiresAt
        : (row.expiresAt as Date).toISOString()
      : ""
  );
  const [isFavorite, setIsFavorite] = useState<boolean>(
    row.isFavorite ?? false
  );
  const [isPublic, setIsPublic] = useState<boolean>(row.isPublic ?? false);
  const [password, setPassword] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/shorten/${row.id}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
    })();
  }, [row.id]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shorten/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          originalUrl: originalUrl.trim(),
          description: description || null,
          maxClicks: maxClicks === "" ? undefined : Number(maxClicks),
          expiresAt: expiresAt || null,
          slug: slug || null,
          isFavorite,
          isPublic,
          password: password === "" ? undefined : password,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Update failed");
      toast.success("Short Link updated");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removePassword = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shorten/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to remove password");
      toast.success("Password removed");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            setOpen((prev) => !prev);
          }}
        >
          <IconEdit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Short Link</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 max-h-[70vh] overflow-auto pr-1">
          <Label>Original URL</Label>
          <Input
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
          />

          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Label>Max clicks (optional)</Label>
          <Input
            type="number"
            min={0}
            value={maxClicks}
            onChange={(e) => {
              const v = e.target.value;
              setMaxClicks(v === "" ? "" : Math.max(0, Number(v)));
            }}
            placeholder="e.g. 100"
          />

          <Label>Expires at (optional)</Label>
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />

          <Label>Favorite</Label>
          <Switch checked={isFavorite} onCheckedChange={setIsFavorite} />

          <div className="flex flex-col justify-between gap-2">
            <Label>Public</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            {isPublic && (
              <div className="flex flex-col gap-2">
                <Label>Set Password</Label>
                <div className="flex gap-1">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty to not change"
                  />
                  <Button variant="outline" onClick={removePassword}>
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Label>Custom Slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Leave empty to auto-generate"
          />
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
