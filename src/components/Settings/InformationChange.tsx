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

import React, { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";

export default function InformationChange() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  type Summary = {
    resources: {
      files: { used: number; limit: number | null; remaining?: number | null };
      shortLink: {
        used: number;
        limit: number | null;
        remaining?: number | null;
      };
      [k: string]: {
        used: number;
        limit: number | null;
        remaining?: number | null;
      };
    };
    storage: {
      maxStorageMb: number | null;
      usedStorageMb: number;
      remainingStorageMb: number | null;
    };
    dailyQuota: {
      dailyQuotaMb: number | null;
      usedTodayMb: number;
      remainingTodayMb: number | null;
    };
    perUpload: {
      maxUploadMb: number;
      maxFilesPerUpload: number;
    };
  };

  const [summary, setSummary] = useState<Summary | null>(null);

  const handleSaveName = async () => {
    setLoading(true);
    try {
      const body: { username?: string; displayName?: string } = {};
      if (username.trim()) body.username = username.trim();
      if (displayName.trim() || displayName === "")
        body.displayName = displayName.trim();

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.err || "Failed to update profile", {
          description:
            data.message || "An error occurred while updating your profile.",
        });
      } else {
        toast.success("Profile updated");
      }
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/user/profile", { cache: "no-store" });
        if (!r.ok) return;
        const p = await r.json();
        setUsername(p.username ?? "");
        setDisplayName(p.displayName ?? "");
      } catch {}

      try {
        const s = await fetch("/api/user/summary", { cache: "no-store" });
        if (s.ok) {
          const data = await s.json();
          setSummary(data);
        }
      } catch {}
    })();
  }, []);

  const fmt = (v?: number | null) =>
    v === null || typeof v === "undefined"
      ? "∞"
      : Math.max(0, Math.round(v)).toString();

  const resourceLabels: Record<string, string> = {
    files: "Files",
    shortLink: "Short links",
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="grid gap-2">
        <Label htmlFor="username" className="text-foreground">
          Username
        </Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your-handle"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="displayName" className="text-foreground">
          Display Name
        </Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How your name appears"
        />
      </div>

      {summary && (
        <div className="p-3 rounded-md border bg-muted text-sm space-y-2">
          <p className="font-medium">Summary</p>

          <div className="space-y-1">
            <p>
              Storage used: {fmt(summary.storage.usedStorageMb)} MB /{" "}
              {fmt(summary.storage.maxStorageMb)} MB
            </p>
            <p>
              Daily uploads: {fmt(summary.dailyQuota.usedTodayMb)} MB /{" "}
              {fmt(summary.dailyQuota.dailyQuotaMb)} MB
            </p>
            <p>
              Per upload: up to {fmt(summary.perUpload.maxUploadMb)} MB, max{" "}
              {summary.perUpload.maxFilesPerUpload} files
            </p>
          </div>

          <div className="h-px bg-border my-1" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {(["files", "shortLink"] as const).map((key) => {
              const r = summary.resources[key];
              if (!r) return null;
              return (
                <p key={key}>
                  {resourceLabels[key]}: {fmt(r.used)} / {fmt(r.limit)}
                </p>
              );
            })}
          </div>
        </div>
      )}

      <Button
        variant="secondary"
        onClick={handleSaveName}
        disabled={loading || (!username && !displayName)}
      >
        {loading ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
