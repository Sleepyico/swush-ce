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

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  IconDeviceDesktop,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

type SessionItem = {
  id: string;
  createdAt?: string | null;
  expiresAt?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  current?: boolean;
};

export default function SessionsSection() {
  const [items, setItems] = useState<SessionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sessions", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setItems(Array.isArray(json) ? json : json.sessions || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load sessions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/auth/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(
        id === "current" ? "Logged out this device" : "Session revoked"
      );
      await load();
      if (typeof window !== "undefined" && id === "current") {
        window.location.href = "/login";
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not revoke session");
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId("*");
    try {
      const res = await fetch(`/api/auth/sessions?others=1`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Logged out from other devices");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Could not log out of other devices");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Sessions ⏱️
      </h2>

      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading || busyId !== null}
        >
          Refresh
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={revokeOthers}
          disabled={loading || items?.length === 0 || busyId !== null}
        >
          Log out of other devices
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="py-2 px-3 text-left">Device</TableHead>
              <TableHead className="py-2 px-3 text-left">IP</TableHead>
              <TableHead className="py-2 px-3 text-left">Expires</TableHead>
              <TableHead className="py-2 px-3 text-left">Status</TableHead>
              <TableHead className="py-2 px-3 text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>

          {!items || items.length === 0 ? (
            <TableCaption className="py-4 text-center text-muted-foreground">
              {loading ? "Loading..." : "No active sessions"}
            </TableCaption>
          ) : (
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="py-2 px-3" title={s.userAgent || "Unknown device"}>
                    <div className="flex items-center gap-2">
                      <IconDeviceDesktop size={16} />
                      <span className="font-medium break-all max-w-sm truncate">
                        {s.userAgent || "Unknown device"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {s.ip || (
                      <span className="text-muted-foreground">IP unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {formatDate(s.expiresAt)}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {s.current ? (
                      <Badge variant="default">Current</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-3 flex gap-2">
                    {s.current ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revoke("current")}
                        disabled={busyId !== null}
                      >
                        <IconTrash size={16} /> Log out this device
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revoke(s.id)}
                        disabled={busyId !== null}
                      >
                        <IconTrash size={16} /> Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>
    </section>
  );
}
