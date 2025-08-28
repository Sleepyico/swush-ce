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

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  IconLock,
  IconLockOpen,
  IconTrash,
  IconRefresh,
  IconPlus,
  IconSparkles,
  IconFlameFilled,
} from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import PageLayout from "../Common/PageLayout";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationFooter } from "../Shared/PaginationFooter";
import { randomPassword } from "@/lib/api/helpers";

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: string;
  isLocked: boolean;
  lockReason?: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  maxStorageMb: number | null;
  maxUploadMb: number | null;
  filesLimit: number | null;
  shortLinksLimit: number | null;
  twoFactor: boolean;
  usage: {
    files: number;
    storageBytes: number;
    links: number;
    clicks: number;
  };
}

function hasCustomLimits(u: AdminUser) {
  return (
    u.maxStorageMb != null ||
    u.maxUploadMb != null ||
    u.filesLimit != null ||
    u.shortLinksLimit != null
  );
}

function normLimit(v: number | null | undefined): number | null {
  return v === 0 || v == null ? null : v;
}

function normalizeUser(u: AdminUser): AdminUser {
  const safeUsage = u.usage ?? {
    files: 0,
    storageBytes: 0,
    links: 0,
    clicks: 0,
  };

  return {
    ...u,
    maxStorageMb: normLimit(u.maxStorageMb),
    maxUploadMb: normLimit(u.maxUploadMb),
    filesLimit: normLimit(u.filesLimit),
    shortLinksLimit: normLimit(u.shortLinksLimit),
    usage: safeUsage,
  };
}

export default function AdminUsersClient() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [lockReason, setLockReason] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    username: "",
    password: "",
    role: "user" as "owner" | "admin" | "user",
  });

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<AdminUser | null>(null);
  const [clearOpts, setClearOpts] = useState({
    filesMode: "none" as "none" | "all" | "exceptFavorites",
    links: false,
  });

  const [disable2faBusyId, setDisable2faBusyId] = useState<string | null>(null);
  const [confirmDisable2faOpen, setConfirmDisable2faOpen] = useState(false);
  const [disable2faTarget, setDisable2faTarget] = useState<AdminUser | null>(
    null
  );
  const [limitsDialogOpen, setLimitsDialogOpen] = useState(false);
  const [limitsTarget, setLimitsTarget] = useState<AdminUser | null>(null);
  const [limitsForm, setLimitsForm] = useState({
    maxStorageMb: "",
    maxUploadMb: "",
    filesLimit: "",
    shortLinksLimit: "",
  });
  const PAGE_SIZE_OPTIONS = [5, 15, 30, 60] as const;
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [sortKey, setSortKey] = useState<"login" | "registered" | "name">(
    "registered"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function prefillFromUser(u: AdminUser) {
    setLimitsForm({
      maxStorageMb: u.maxStorageMb == null ? "" : String(u.maxStorageMb),
      maxUploadMb: u.maxUploadMb == null ? "" : String(u.maxUploadMb),
      filesLimit: u.filesLimit == null ? "" : String(u.filesLimit),
      shortLinksLimit:
        u.shortLinksLimit == null ? "" : String(u.shortLinksLimit),
    });
  }

  async function openLimitsDialog(u: AdminUser) {
    setLimitsTarget(u);
    prefillFromUser(u);
    setLimitsDialogOpen(true);
  }

  async function saveLimits() {
    if (!limitsTarget) return;
    try {
      const body: Record<string, number | null> = {};
      const parse = (v: string) => {
        const t = v.trim();
        if (t === "") return null;
        const n = Number(t);
        return Number.isFinite(n) && n >= 0 ? n : null;
      };
      const fields: (keyof typeof limitsForm)[] = [
        "maxStorageMb",
        "maxUploadMb",
        "filesLimit",
        "shortLinksLimit",
      ];
      for (const f of fields) body[f] = parse(limitsForm[f]);

      const res = await fetch(`/api/admin/users/${limitsTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { message?: string }));
        toast.error(err.message || "Failed to save limits");
        return;
      }

      const payload = (await res.json()) as { ok: boolean; user?: AdminUser };

      const merged = payload.user ? normalizeUser(payload.user) : undefined;
      setUsers((prev) =>
        (prev ?? []).map((x) =>
          x.id === limitsTarget.id && merged ? { ...x, ...merged } : x
        )
      );

      toast.success("Limits saved");
      setLimitsDialogOpen(false);
      setLimitsTarget(null);
    } catch (e) {
      toast.error(`Action failed: ${String(e)}`);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }
  function allSelectedOnPage(list: AdminUser[]) {
    if (list.length === 0) return false;
    return list.every((u) => selectedIds.has(u.id));
  }
  function toggleAllOnPage(list: AdminUser[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const all = list.every((u) => next.has(u.id));
      if (all) list.forEach((u) => next.delete(u.id));
      else list.forEach((u) => next.add(u.id));
      return next;
    });
  }

  const filtered: AdminUser[] = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();

    const base = !q
      ? users
      : users.filter((u) =>
          [u.email, u.username ?? "", u.displayName ?? "", u.role]
            .join(" ")
            .toLowerCase()
            .includes(q)
        );

    const nameOf = (u: AdminUser) =>
      (u.displayName || u.username || u.email || "").toLowerCase();

    const dateNum = (iso: string | null | undefined) => {
      if (!iso) return Number.NaN;
      const t = Date.parse(iso);
      return Number.isNaN(t) ? Number.NaN : t;
    };

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        const an = nameOf(a);
        const bn = nameOf(b);
        cmp = an < bn ? -1 : an > bn ? 1 : 0;
      } else if (sortKey === "registered") {
        const at = dateNum(a.createdAt);
        const bt = dateNum(b.createdAt);
        if (Number.isNaN(at) && Number.isNaN(bt)) cmp = 0;
        else if (Number.isNaN(at)) cmp = 1;
        else if (Number.isNaN(bt)) cmp = -1;
        else cmp = at - bt;
      } else if (sortKey === "login") {
        const at = dateNum(a.lastLoginAt);
        const bt = dateNum(b.lastLoginAt);
        if (Number.isNaN(at) && Number.isNaN(bt)) cmp = 0;
        else if (Number.isNaN(at)) cmp = 1;
        else if (Number.isNaN(bt)) cmp = -1;
        else cmp = at - bt;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [users, query, sortKey, sortDir]);

  async function createUser() {
    try {
      const payload = {
        email: createForm.email.trim(),
        username: createForm.username.trim(),
        password: createForm.password,
        role: createForm.role,
      };
      if (!payload.email || !payload.username || !payload.password) {
        toast.error("Email, username, and password are required");
        return;
      }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { message?: string }));
        toast.error(err.message || "Failed to create user");
        return;
      }
      const created = (await res.json()) as { ok: boolean; user?: AdminUser };
      if (created.user) {
        setUsers((prev) => [normalizeUser(created.user!), ...(prev ?? [])]);
      } else {
        void fetchUsers();
      }
      setCreateDialogOpen(false);
      setCreateForm({ email: "", username: "", password: "", role: "user" });
      toast.success("User created");
    } catch (e) {
      toast.error(`Action failed: ${String(e)}`);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.status === 403) {
        setUsers(null);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const raw = (await res.json()) as AdminUser[];
      const data = raw.map(normalizeUser);
      setUsers(data);
    } catch (e) {
      setUsers(null);
      toast.error(`Failed to load users: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, []);

  async function lockUser(u: AdminUser, lock: boolean, reason?: string) {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lock, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { message?: string }));
        toast.error(err.message || "Failed to update user");
        return;
      }
      setUsers((prev) =>
        (prev ?? []).map((x) =>
          x.id === u.id
            ? { ...x, isLocked: lock, lockReason: lock ? reason ?? null : null }
            : x
        )
      );
      toast.success(lock ? "User locked" : "User unlocked");
      setLockDialogOpen(false);
      setLockTarget(null);
      setLockReason("");
    } catch {
      toast.error("Action failed");
    }
  }

  async function changeRole(u: AdminUser, role: "owner" | "admin" | "user") {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Unknown error");
      }

      setUsers((prev) =>
        (prev ?? []).map((x) => (x.id === u.id ? { ...x, role } : x))
      );
      toast.success(`Role changed to ${role}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed";
      toast.error(msg);
    }
  }

  async function deleteUser(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { message?: string }));
        toast.error(err.message || "Failed to delete");
        return;
      }
      setUsers((prev) => (prev ?? []).filter((u) => u.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function bulkLock(lock: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lock }),
        });
        return { id, ok: res.ok };
      })
    );
    const okIds = results
      .filter(
        (r): r is PromiseFulfilledResult<{ id: string; ok: boolean }> =>
          r.status === "fulfilled" && r.value.ok
      )
      .map((r) => r.value.id);
    if (okIds.length) {
      setUsers((prev) =>
        (prev ?? []).map((u) =>
          okIds.includes(u.id)
            ? {
                ...u,
                isLocked: lock,
                lockReason: lock ? u.lockReason ?? null : null,
              }
            : u
        )
      );
      toast.success(
        `${lock ? "Locked" : "Unlocked"} ${okIds.length} user${
          okIds.length > 1 ? "s" : ""
        }`
      );
    }
    clearSelection();
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        return { id, ok: res.ok };
      })
    );
    const okIds = results
      .filter(
        (r): r is PromiseFulfilledResult<{ id: string; ok: boolean }> =>
          r.status === "fulfilled" && r.value.ok
      )
      .map((r) => r.value.id);
    if (okIds.length) {
      setUsers((prev) => (prev ?? []).filter((u) => !okIds.includes(u.id)));
      toast.success(
        `Deleted ${okIds.length} user${okIds.length > 1 ? "s" : ""}`
      );
    }
    clearSelection();
    setConfirmDeleteOpen(false);
  }

  async function clearUserData() {
    if (!clearTarget) return;
    const options: Record<string, unknown> = {
      links: clearOpts.links,
    };
    if (clearOpts.filesMode === "all") options.filesAll = true;
    if (clearOpts.filesMode === "exceptFavorites")
      options.filesExceptFavorites = true;

    const res = await fetch(`/api/admin/users/${clearTarget.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clear", options }),
    });
    if (!res.ok) {
      const err = await res.json().catch();
      toast.error(err.message || "Failed to clear data");
      return;
    }
    toast.success("Data cleared");
    setClearDialogOpen(false);
    setClearTarget(null);
    void fetchUsers();
  }

  async function disable2fa(u: AdminUser) {
    try {
      setDisable2faBusyId(u.id);
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disable2FA: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { message?: string }));
        toast.error(err.message || "Failed to disable 2FA");
        return;
      }
      toast.success("2FA disabled for user");
      setUsers((prev) =>
        (prev ?? []).map((x) =>
          x.id === u.id ? { ...x, twoFactor: false } : x
        )
      );
    } catch (e) {
      toast.error(`Action failed: ${String(e)}`);
    } finally {
      setDisable2faBusyId(null);
    }
  }

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filtered,
    pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize, setPage]);

  function handleGeneratePassword() {
    const pwd = randomPassword(16);
    setCreateForm((f) => ({ ...f, password: pwd }));
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pwd).catch(() => {});
    }
    toast.success(
      "Password generated" + (navigator.clipboard ? " & copied" : "")
    );
  }

  return (
    <PageLayout
      title="Manage Users"
      subtitle="Manage members, lock accounts, and review usage."
      toolbar={
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            className="w-full"
          />
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
          <Select
            value={sortKey}
            onValueChange={(v) =>
              setSortKey(v as "login" | "registered" | "name")
            }
          >
            <SelectTrigger className="rounded-md border text-sm px-2 min-w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="registered">Registered date</SelectItem>
              <SelectItem value="login">Last login</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortDir}
            onValueChange={(v) => setSortDir(v as "desc" | "asc")}
          >
            <SelectTrigger className="rounded-md border text-sm px-2 min-w-[120px]">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Desc</SelectItem>
              <SelectItem value="asc">Asc</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => void fetchUsers()}
            className="gap-2"
          >
            <IconRefresh className="h-4 w-4" /> Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <IconPlus className="h-4 w-4" /> Create user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new user</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Username
                  </label>
                  <Input
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, username: e.target.value }))
                    }
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Password
                  </label>
                  <div className="flex gap-1">
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          password: e.target.value,
                        }))
                      }
                      placeholder="temporary password"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-1"
                      onClick={handleGeneratePassword}
                    >
                      <IconSparkles className="h-4 w-4" /> Generate
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Role</label>
                  <Select
                    value={createForm.role}
                    onValueChange={(val) =>
                      setCreateForm((f) => ({
                        ...f,
                        role: val as "owner" | "admin" | "user",
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-[160px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="owner">owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => void createUser()}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <Card>
        <CardContent className="px-2 overflow-x-auto">
          {selectedIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
              <span>
                <strong>{selectedIds.size}</strong> selected out of{" "}
                {filtered.length}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => toggleAllOnPage(paginatedItems)}
                  disabled={paginatedItems.length === 0}
                  size="sm"
                >
                  Select Page ({paginatedItems.length})
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void bulkLock(true)}
                >
                  <IconLock className="h-4 w-4" /> Lock Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void bulkLock(false)}
                >
                  <IconLockOpen className="h-4 w-4" /> Unlock Selected
                </Button>
                <AlertDialog
                  open={confirmDeleteOpen}
                  onOpenChange={setConfirmDeleteOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <IconTrash className="h-4 w-4" /> Remove Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete {selectedIds.size} selected user
                        {selectedIds.size === 1 ? "" : "s"}?
                      </AlertDialogTitle>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone.
                      </p>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void bulkDelete()}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
          <Table className="w-full text-sm">
            <TableHeader className="text-left text-muted-foreground border-b border-border">
              <TableRow>
                <TableHead className="py-3 pl-4 pr-2 w-10">
                  <Checkbox
                    checked={allSelectedOnPage(paginatedItems)}
                    onCheckedChange={() => toggleAllOnPage(paginatedItems)}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead className="py-3 px-3 font-medium">User</TableHead>
                <TableHead className="py-3 px-3 font-medium">Role</TableHead>
                <TableHead className="py-3 px-3 font-medium">Status</TableHead>
                <TableHead className="py-3 px-3 font-medium">Usage</TableHead>
                <TableHead className="py-3 px-3 font-medium text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((u) => (
                  <TableRow key={u.id} className="border-b border-zinc-800/70">
                    <TableCell className="py-2 pl-4 pr-2 align-top">
                      <Checkbox
                        checked={selectedIds.has(u.id)}
                        onCheckedChange={() => toggleSelected(u.id)}
                        aria-label="Select row"
                      />
                    </TableCell>

                    <TableCell className="py-3 px-3 align-top">
                      <div className="font-medium">
                        {u.displayName && <span>{u.displayName} -</span>}{" "}
                        {u.username && <span>@{u.username}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Joined {new Date(u.createdAt).toLocaleDateString()}
                        {u.lastLoginAt &&
                          ` · Last login ${new Date(
                            u.lastLoginAt
                          ).toLocaleString()}`}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-3 align-top">
                      <Select
                        value={u.role}
                        onValueChange={(val) =>
                          void changeRole(u, val as "owner" | "admin" | "user")
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">owner</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="user">user</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="py-3 px-3 align-top">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs">
                          <IconLock className="h-3.5 w-3.5" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs">
                          <IconLockOpen className="h-3.5 w-3.5" /> Active
                        </span>
                      )}
                      {u.isLocked && u.lockReason && (
                        <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          Reason: {u.lockReason ?? ""}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-3 px-3 align-top">
                      <div className="space-y-1 text-xs">
                        <div className="text-muted-foreground">
                          {u.usage?.files ?? 0} files ·{" "}
                          {(
                            (u.usage?.storageBytes ?? 0) /
                            (1024 * 1024)
                          ).toFixed(1)}{" "}
                          MB
                        </div>
                        <div className="text-muted-foreground">
                          {u.usage?.links ?? 0} short links ·{" "}
                          {u.usage?.clicks ?? 0} clicks
                        </div>
                        {hasCustomLimits(u) && (
                          <div className="mt-1 text-[11px] text-purple-700 dark:text-purple-400">
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-900/40 px-2 py-0.5">
                              Custom limits
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-3 align-top">
                      <div className="flex justify-end gap-2">
                        {u.isLocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void lockUser(u, false)}
                          >
                            <IconLockOpen className="h-4 w-4" /> Unlock
                          </Button>
                        ) : (
                          <AlertDialog
                            open={lockDialogOpen && lockTarget?.id === u.id}
                            onOpenChange={(o) => {
                              setLockDialogOpen(o);
                              if (!o) {
                                setLockTarget(null);
                                setLockReason("");
                              }
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setLockTarget(u);
                                  setLockDialogOpen(true);
                                }}
                              >
                                <IconLock className="h-4 w-4" /> Lock
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Lock this user?
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <div className="grid gap-2">
                                <label className="text-sm text-muted-foreground">
                                  Optional reason to show on login
                                </label>
                                <Textarea
                                  value={lockReason}
                                  onChange={(e) =>
                                    setLockReason(e.target.value)
                                  }
                                  placeholder="e.g. Payment issue, TOS violation, temporary investigation…"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (!lockTarget) return;
                                    void lockUser(
                                      lockTarget,
                                      true,
                                      lockReason.trim() || undefined
                                    );
                                  }}
                                >
                                  Confirm lock
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {u.twoFactor ? (
                          <AlertDialog
                            open={
                              confirmDisable2faOpen &&
                              disable2faTarget?.id === u.id
                            }
                            onOpenChange={(o) => {
                              setConfirmDisable2faOpen(o);
                              if (!o) setDisable2faTarget(null);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={disable2faBusyId === u.id}
                                onClick={() => {
                                  setDisable2faTarget(u);
                                  setConfirmDisable2faOpen(true);
                                }}
                              >
                                Disable 2FA
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Disable 2FA for {u.email}?
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <p className="text-sm text-muted-foreground">
                                This will remove their TOTP secret and backup
                                codes. They will be able to log in with just
                                their password until they re-enable 2FA.
                              </p>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void disable2fa(u)}
                                >
                                  Confirm disable
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            title="2FA is not enabled"
                          >
                            2FA disabled
                          </Button>
                        )}

                        <Dialog
                          open={clearDialogOpen && clearTarget?.id === u.id}
                          onOpenChange={(o) => {
                            setClearDialogOpen(o);
                            if (!o) setClearTarget(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => {
                                setClearTarget(u);
                                setClearDialogOpen(true);
                              }}
                            >
                              <IconFlameFilled className="h-4 w-4" /> Clear
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Clear data for {u.email}
                              </DialogTitle>
                            </DialogHeader>

                            <div className="grid gap-3 text-sm">
                              <div className="border rounded-md p-2">
                                <div className="font-medium mb-1">Files</div>
                                <div className="flex gap-3">
                                  <label className="inline-flex items-center gap-2 text-xs">
                                    <input
                                      type="radio"
                                      name={`files-mode-${u.id}`}
                                      checked={clearOpts.filesMode === "none"}
                                      onChange={() =>
                                        setClearOpts((o) => ({
                                          ...o,
                                          filesMode: "none",
                                        }))
                                      }
                                    />
                                    Do not delete files
                                  </label>
                                  <label className="inline-flex items-center gap-2 text-xs">
                                    <input
                                      type="radio"
                                      name={`files-mode-${u.id}`}
                                      checked={clearOpts.filesMode === "all"}
                                      onChange={() =>
                                        setClearOpts((o) => ({
                                          ...o,
                                          filesMode: "all",
                                        }))
                                      }
                                    />
                                    Delete all files
                                  </label>
                                  <label className="inline-flex items-center gap-2 text-xs">
                                    <input
                                      type="radio"
                                      name={`files-mode-${u.id}`}
                                      checked={
                                        clearOpts.filesMode ===
                                        "exceptFavorites"
                                      }
                                      onChange={() =>
                                        setClearOpts((o) => ({
                                          ...o,
                                          filesMode: "exceptFavorites",
                                        }))
                                      }
                                    />
                                    Delete all except favorites
                                  </label>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <label className="inline-flex items-center gap-2">
                                  <Checkbox
                                    checked={clearOpts.links}
                                    onCheckedChange={(v) =>
                                      setClearOpts((o) => ({
                                        ...o,
                                        links: !!v,
                                      }))
                                    }
                                  />
                                  Links
                                </label>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setClearDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => void clearUserData()}
                              >
                                Clear selected
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={limitsDialogOpen && limitsTarget?.id === u.id}
                          onOpenChange={(o) => {
                            setLimitsDialogOpen(o);
                            if (!o) setLimitsTarget(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLimitsDialog(u)}
                            >
                              Edit limits
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Edit limits for {u.email}
                                <span className="block text-xs text-muted-foreground font-normal mt-1">
                                  Leave empty to use global defaults
                                </span>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Storage cap (MB)
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={limitsForm.maxStorageMb}
                                    onChange={(e) =>
                                      setLimitsForm((f) => ({
                                        ...f,
                                        maxStorageMb: e.target.value,
                                      }))
                                    }
                                    placeholder="empty = default"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Max upload (MB)
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={limitsForm.maxUploadMb}
                                    onChange={(e) =>
                                      setLimitsForm((f) => ({
                                        ...f,
                                        maxUploadMb: e.target.value,
                                      }))
                                    }
                                    placeholder="empty = default"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Files limit
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={limitsForm.filesLimit}
                                    onChange={(e) =>
                                      setLimitsForm((f) => ({
                                        ...f,
                                        filesLimit: e.target.value,
                                      }))
                                    }
                                    placeholder="empty = default"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Short links limit
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={limitsForm.shortLinksLimit}
                                    onChange={(e) =>
                                      setLimitsForm((f) => ({
                                        ...f,
                                        shortLinksLimit: e.target.value,
                                      }))
                                    }
                                    placeholder="empty = default"
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setLimitsDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={() => void saveLimits()}>
                                Save
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <IconTrash className="h-4 w-4" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <p className="text-sm text-muted-foreground">
                              This will permanently remove {u.email}. This
                              action cannot be undone.
                            </p>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void deleteUser(u.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationFooter
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
