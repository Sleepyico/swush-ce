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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TwoFactorAuthentication() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  const handleStart2FA = async () => {
    try {
      const res = await fetch("/api/2fa/setup");
      const data = await res.json();
      setQrCode(data.qr);
      setShowOtpDialog(true);
    } catch (error) {
      console.error("Failed to fetch QR code", error);
    }
  };

  const handleVerify2FA = async () => {
    setOtpLoading(true);
    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ token: otp }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to verify, " + (data.message || "Unknown error"));
      } else {
        toast.success("2FA enabled successfully");
        setIsTwoFactorEnabled(true);
        setShowOtpDialog(false);
      }
    } catch (error) {
      console.error("Something went wrong:", error);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRemove2FA = async () => {
    try {
      const res = await fetch("/api/2fa/remove", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(
          "Failed to disable 2FA, " + (data.message || "Please try again.")
        );
      } else {
        toast.success("2FA disabled successfully");
        setIsTwoFactorEnabled(false);
      }
    } catch (err) {
      console.error("Failed to disable 2FA:", err);
    }
  };

  useEffect(() => {
    const fetch2FAStatus = async () => {
      try {
        const res = await fetch("/api/2fa/status");
        if (res.ok) {
          const data = await res.json();
          setIsTwoFactorEnabled(data.isTwoFactorEnabled);
        }
      } catch (err) {
        console.error("Failed to check 2FA status:", err);
      }
    };

    fetch2FAStatus();
  }, []);

  return (
    <div className="space-y-4 border-t pt-2">
      <h2 className="text-lg font-semibold text-foreground mb-2">2FA 🛡️</h2>

      {isTwoFactorEnabled ? (
        <>
          <Button
            variant="destructive"
            onClick={() => setConfirmDisableOpen(true)}
          >
            Disable 2FA
          </Button>

          <AlertDialog
            open={confirmDisableOpen}
            onOpenChange={setConfirmDisableOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Disable two‑factor authentication?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You will no longer be required to enter a one‑time code when
                  signing in. You can re‑enable 2FA at any time from settings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await handleRemove2FA();
                    setConfirmDisableOpen(false);
                  }}
                >
                  Disable
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
          <DialogTrigger asChild>
            <Button variant="secondary" onClick={handleStart2FA}>
              Enable 2FA with Authenticator
            </Button>
          </DialogTrigger>
          <DialogContent className=" items-center justify-center">
            {qrCode && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-white text-sm">
                  Scan this QR in your Authenticator App:
                </p>
                <Image src={qrCode} alt="2FA QR" width={200} height={200} />
                <p className="text-muted-foreground text-sm">
                  Then enter the 6‑digit code below:
                </p>
              </div>
            )}
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {Array(6)
                  .fill(0)
                  .map((_, idx) => (
                    <InputOTPSlot key={idx} index={idx} />
                  ))}
              </InputOTPGroup>
            </InputOTP>
            <Button
              onClick={handleVerify2FA}
              disabled={otp.length !== 6 || otpLoading}
            >
              {otpLoading ? "Verifying..." : "Verify & Enable 2FA"}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
