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

import { format } from "date-fns";
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import ShareX from "../Icons/ShareX";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { IconClipboard, IconX } from "@tabler/icons-react";
import { useConfig } from "@/hooks/use-config";

type ApiToken = {
  id: string;
  name: string;
  token?: string;
  createdAt: string;
  expiresAt?: string | null;
  isRevoked: boolean;
};

export function ApiTokens() {
  const config = useConfig();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [showToken, setShowToken] = useState<{
    token: string;
    name: string;
  } | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const hasRevoked = tokens.some((t) => t.isRevoked);

  useEffect(() => {
    const fetchTokens = async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/tokens");
        if (!r.ok) throw new Error("Failed to fetch tokens");
        const data = await r.json();
        setTokens(data.tokens || []);
      } catch (err) {
        toast.error(`Could not load tokens: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
  }, [refreshFlag]);

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      toast.error("Token name required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName.trim(),
          expiresInDays: expiryDays ? Number(expiryDays) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create token");
      } else {
        setDialogOpen(false);
        setTokenName("");
        setExpiryDays("");
        setShowToken({ token: data.token, name: tokenName.trim() });
        setRefreshFlag((f) => f + 1);
        toast.success("Token created! Copy and save it now.");
      }
    } catch (err) {
      toast.error(`Failed to create token: ${(err as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch("/api/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Failed to revoke token");
      } else {
        toast.success("Token revoked");
        setRefreshFlag((f) => f + 1);
      }
    } catch (err) {
      toast.error(`Failed to revoke token: ${(err as Error).message}`);
    }
  };

  const handleClearRevoked = async () => {
    try {
      const res = await fetch("/api/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearRevoked: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to clear revoked tokens");
        return;
      }
      setTokens((prev) => prev.filter((t) => !t.isRevoked));
      setClearOpen(false);
      toast.success("Cleared all revoked tokens");
    } catch (err) {
      toast.error(`Failed to clear revoked tokens: ${(err as Error).message}`);
    }
  };

  const handleExportShareX = (token: ApiToken) => {
    const origin = typeof window !== "undefined" ? config?.appUrl : "";
    const sxcu = {
      Version: "14.1.0",
      Name: token.name || "Swush Upload",
      DestinationType: "ImageUploader, FileUploader, TextUploader",
      RequestMethod: "POST",
      RequestURL: `${origin}/api/upload`,
      Headers: {
        authorization: `Bearer ${token.token || ""}`,
      },
      Body: "MultipartFormData",
      FileFormName: "file",
      Arguments: {
        name: "{filename}",
        isPublic: "true",
      },
      URL: "{json:url}",
      ErrorMessage: "{response}",
    } as const;

    const blob = new Blob([JSON.stringify(sxcu, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(token.name || "swush-upload").replace(/\s+/g, "_")}.sxcu`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("ShareX upload config exported");
  };

  const handleExportShareXShortener = (token: ApiToken) => {
    const origin = typeof window !== "undefined" ? config?.appUrl : "";
    const sxcu = {
      Version: "14.1.0",
      Name: token.name ? `${token.name} (Shortener)` : "Swush Shortener",
      DestinationType: "URLShortener, URLSharingService",
      RequestMethod: "POST",
      RequestURL: `${origin}/api/shorten`,
      Headers: {
        authorization: `Bearer ${token.token || ""}`,
      },
      Body: "JSON",
      Data: '{"originalUrl":"{input}"}',
      URL: "{json:url}",
      ErrorMessage: "{response}",
    } as const;

    const blob = new Blob([JSON.stringify(sxcu, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(token.name || "swush-shortener").replace(
      /\s+/g,
      "_"
    )}.sxcu`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("ShareX shortener config exported");
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copied!");
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        API Tokens 🔑
      </h2>
      <p className="text-muted-foreground mb-4">
        Generate API tokens to integrate with tools like ShareX or Flameshot.
        Use these tokens for uploading screenshots or files directly to your
        account.
      </p>
      <div className="mb-4 flex items-center gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Create New Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Token</DialogTitle>
              <DialogDescription>
                Name your token and optionally set an expiry (in days).
                You&apos;ll only see the token once.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="token-name">Name</Label>
                <Input
                  id="token-name"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. ShareX Desktop"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry-days">Expiry (days, optional)</Label>
                <Input
                  id="expiry-days"
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(e) =>
                    setExpiryDays(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="e.g. 30"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateToken}
                disabled={creating || !tokenName.trim()}
              >
                {creating ? "Creating..." : "Create Token"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={clearOpen} onOpenChange={setClearOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!hasRevoked}
              title={
                hasRevoked ? "Delete all revoked tokens" : "No revoked tokens"
              }
            >
              Clear revoked
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete all revoked tokens?</DialogTitle>
              <DialogDescription>
                This will permanently remove all revoked tokens from your
                account. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClearOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearRevoked}>
                Delete revoked
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showToken && (
        <div className="mb-4 bg-muted p-3 flex flex-col md:flex-row items-center gap-2 rounded-lg">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="font-mono text-sm break-all">
              {showToken.token}
            </span>
            <div className="flex items-center">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCopyToken(showToken.token)}
                title="Copy token"
                className=""
              >
                <IconClipboard className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                (Copy and save this token now!)
              </span>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => {
                handleExportShareX({
                  ...showToken,
                  createdAt: new Date().toISOString(),
                  isRevoked: false,
                  id: "temp",
                } as ApiToken);
              }}
            >
              <ShareX /> Uploader
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                handleExportShareXShortener({
                  ...showToken,
                  createdAt: new Date().toISOString(),
                  isRevoked: false,
                  id: "temp",
                } as ApiToken);
              }}
            >
              <ShareX /> Shortener
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowToken(null)}
              title="Dismiss"
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-md">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="py-2 px-3 text-left">Name</TableHead>
              <TableHead className="py-2 px-3 text-left">Created</TableHead>
              <TableHead className="py-2 px-3 text-left">Expiry</TableHead>
              <TableHead className="py-2 px-3 text-left">Status</TableHead>
              <TableHead className="py-2 px-3 text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {tokens.length === 0 ? (
            <TableCaption className="py-4 text-center text-muted-foreground">
              {loading ? "Loading..." : "No API tokens"}
            </TableCaption>
          ) : (
            <TableBody>
              {tokens.map((token) => (
                <TableRow
                  key={token.id}
                  className={token.isRevoked ? "opacity-60" : ""}
                >
                  <TableCell className="py-2 px-3 font-medium">
                    {token.name}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {token.createdAt
                      ? format(new Date(token.createdAt), "yyyy-MM-dd")
                      : "--"}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {token.expiresAt ? (
                      format(new Date(token.expiresAt), "yyyy-MM-dd")
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {token.isRevoked ? (
                      <span className="text-destructive">Revoked</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-3 flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={!token.token}
                      onClick={() => {
                        if (token.token) handleCopyToken(token.token);
                        else
                          toast.error(
                            "Token value is hidden on this device. Create a new token to copy it."
                          );
                      }}
                      title={
                        token.token ? "Copy token" : "Token not retrievable"
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={token.isRevoked}
                      onClick={() => {
                        toast.info("Exporting ShareX config...");
                        handleExportShareX(token);
                      }}
                    >
                      <ShareX /> Uploader
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={token.isRevoked}
                      onClick={() => {
                        toast.info("Exporting Shortener config...");
                        handleExportShareXShortener(token);
                      }}
                    >
                      <ShareX /> Shortener
                    </Button>
                    {!token.isRevoked && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevoke(token.id)}
                        title="Revoke token"
                      >
                        Revoke
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
