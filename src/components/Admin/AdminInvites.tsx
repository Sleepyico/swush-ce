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

import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { DBInviteToken } from "@/db/schema";
import PageLayout from "../Common/PageLayout";
import { APP_URL } from "@/lib/constant";

export default function AdminInvites() {
  const [invites, setInvites] = useState<DBInviteToken[] | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invForm, setInvForm] = useState({
    durationHours: 72,
    maxUses: null as number | null,
    note: "",
  });

  async function fetchInvites() {
    setInvLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ type: "invite.list" }),
    });
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites ?? []);
    }
    setInvLoading(false);
  }

  async function createInvite() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "invite.create", ...invForm }),
    });
    const data = await res.json();
    if (res.ok && data.invite) {
      setInvites((v) => [data.invite, ...(v ?? [])]);
      toast.success("Invite created");
    } else {
      toast.error(data.message || "Failed to create invite");
    }
  }

  async function deleteInvite(id: number) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "invite.delete", id }),
    });
    if (res.ok) {
      setInvites((v) => (v ?? []).filter((x) => x.id !== id));
      toast.success("Invite deleted");
    } else {
      toast.error("Failed to delete invite");
    }
  }

  useEffect(() => {
    void fetchInvites();
  }, []);

  return (
    <PageLayout
      title="Invite Links"
      subtitle="Create time-limited registration invites even when signups are closed."
    >
      <Card className="mb-2">
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Duration (hours)
              </label>
              <Input
                type="number"
                value={invForm.durationHours}
                onChange={(e) =>
                  setInvForm((f) => ({
                    ...f,
                    durationHours: Number(e.target.value),
                  }))
                }
                min={1}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Max uses (optional)
              </label>
              <Input
                type="number"
                value={invForm.maxUses ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setInvForm((f) => ({
                    ...f,
                    maxUses: v === "" ? null : Number(v),
                  }));
                }}
                className="mt-1"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Note (optional)
              </label>
              <Input
                value={invForm.note}
                onChange={(e) =>
                  setInvForm((f) => ({ ...f, note: e.target.value }))
                }
                className="mt-1"
                placeholder="e.g., For beta tester"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => void createInvite()}
            >
              Create Invite
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => void fetchInvites()}
              disabled={invLoading}
            >
              {invLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <div className="mt-2">
            {(invites ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No invites yet.</p>
            ) : (
              <div className="space-y-2">
                {(invites ?? []).map((inv) => {
                  const inviteUrl = `${APP_URL}/register?invite=${inv.token}`;
                  const expired = new Date(inv.expiresAt) < new Date();
                  const usageText =
                    inv.maxUses == null
                      ? `${inv.usesCount} used`
                      : `${inv.usesCount}/${inv.maxUses} used`;
                  return (
                    <div
                      key={inv.id}
                      className="rounded-md border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="px-1.5 py-0.5 bg-muted rounded break-all">
                            {inv.token}
                          </code>
                          <span
                            className={`text-xs ${
                              expired
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {expired
                              ? "Expired"
                              : `Expires: ${new Date(
                                  inv.expiresAt
                                ).toLocaleString()}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {usageText}
                          </span>
                          {inv.note && (
                            <span className="text-xs text-muted-foreground">
                              • {inv.note}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground break-all sm:truncate">
                          {inviteUrl}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                          className="w-full sm:w-auto"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard?.writeText(inviteUrl);
                            toast.success("Invite URL copied to clipboard");
                          }}
                        >
                          Copy URL
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteInvite(inv.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
