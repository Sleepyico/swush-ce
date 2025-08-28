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

import React, { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { Button } from "../ui/button";
import TwoFactorAuthentication from "./TwoFactorAuthentication";

export default function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Something went wrong");
      } else {
        toast.success("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error("Something went wrong:", err);
    } finally {
      setPasswordLoading(false);
    }
  };
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Change Password 🔒
      </h2>
      <div className="grid gap-2">
        <Label htmlFor="current-password" className="text-foreground">
          Current Password
        </Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrentPassword ? "text" : "password"}
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((v) => !v)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xl cursor-pointer bg-transparent border-0 outline-none"
            style={{ background: "none", border: "none" }}
            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
          >
            {showCurrentPassword ? "🙈" : "🐵"}
          </button>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-password" className="text-foreground">
          New Password
        </Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((v) => !v)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xl cursor-pointer bg-transparent border-0 outline-none"
            style={{ background: "none", border: "none" }}
            aria-label={showNewPassword ? "Hide password" : "Show password"}
          >
            {showNewPassword ? "🙈" : "🐵"}
          </button>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password" className="text-foreground">
          Confirm New Password
        </Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xl cursor-pointer bg-transparent border-0 outline-none"
            style={{ background: "none", border: "none" }}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? "🙈" : "🐵"}
          </button>
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={handleChangePassword}
        disabled={passwordLoading}
      >
        {passwordLoading ? "Saving..." : "Save Password"}
      </Button>
      <TwoFactorAuthentication />
    </div>
  );
}
