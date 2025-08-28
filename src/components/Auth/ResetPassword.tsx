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

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ExternalLayout from "../Common/ExternalLayout";

export default function ResetPasswordClient() {
  return (
    <Suspense
      fallback={
        <ExternalLayout>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
            </CardHeader>
            <CardContent>Loading…</CardContent>
          </Card>
        </ExternalLayout>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}

function ResetPasswordFormInner() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const router = useRouter();

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!token) {
      toast.warning("Invalid link");
      return;
    }
    if (pwd.length < 8) {
      toast.warning("Password too short");
      return;
    }
    if (pwd !== pwd2) {
      toast.warning("Passwords don’t match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pwd }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({} as { message?: string }));
      toast.error(err.message || "Could not reset password");
      return;
    }
    toast.success("Password updated", {
      description: "You can log in with your new password.",
    });
    router.push("/login");
  }

  return (
    <ExternalLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>New password</Label>
            <div className="relative">
              <Input
                type={show1 ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow1((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-lg"
                aria-label={show1 ? "Hide password" : "Show password"}
              >
                {show1 ? "🐵" : "🙈"}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Repeat password</Label>
            <div className="relative">
              <Input
                type={show2 ? "text" : "password"}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow2((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-lg"
                aria-label={show2 ? "Hide password" : "Show password"}
              >
                {show2 ? "🐵" : "🙈"}
              </button>
            </div>
          </div>

          <Button onClick={() => void submit()} disabled={loading}>
            {loading ? "Saving…" : "Update password"}
          </Button>
        </CardContent>
      </Card>
    </ExternalLayout>
  );
}
