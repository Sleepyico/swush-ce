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

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Image from "next/image";
import bgImage from "../../../public/images/bg.png";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import ThemeButton from "../Common/ThemeButton";
import Link from "next/link";
import { useConfig } from "@/hooks/use-config";

const schema = z.object({
  emailOrUsername: z
    .string()
    .trim()
    .min(3, { message: "Enter at least 3 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

type FormData = z.infer<typeof schema>;

export default function LoginClient() {
  const router = useRouter();
  const config = useConfig();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  const [loading, setLoading] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canVerify2FA = useMemo(
    () => twoFAToken.replace(/\D/g, "").length === 6,
    [twoFAToken]
  );

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (loading) return;
      setLoading(true);

      try {
        const emailOrUsername = data.emailOrUsername.toLowerCase();

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailOrUsername, password: data.password }),

          cache: "no-store",
        });

        const cloned = res.clone();
        let json = null;
        try {
          json = await res.json();
        } catch {}

        if (res.ok && json?.requires2FA) {
          setTwoFAOpen(true);
          return;
        }
        if (res.ok) {
          toast.success("Logged in successfully");
          router.push("/vault");
          return;
        }

        let message = json?.message || json?.error || "";
        if (!message) {
          const text = await cloned.text().catch(() => "");
          message = text?.trim() || res.statusText || "Login failed";
        }
        if (res.status === 429) {
          const ra = res.headers.get("Retry-After");
          const seconds = ra ? Number(ra) : NaN;
          if (!Number.isNaN(seconds) && seconds > 0)
            message = `Too many attempts. Try again in ${seconds}s`;
        }
        toast.error(message);
      } catch (err) {
        toast.error(`Network error. Please try again: ${err}`);
      } finally {
        setLoading(false);
      }
    },
    [loading, router]
  );

  const verify2FA = useCallback(async () => {
    if (!canVerify2FA || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: twoFAToken.replace(/\D/g, "") }),
        cache: "no-store",
      });

      if (res.ok) {
        toast.success("2FA verified");
        router.push("/vault");
        return;
      }

      const cloned = res.clone();
      let json = null;
      try {
        json = await res.json();
      } catch {}
      let message = json?.message || json?.error || "";
      if (!message) {
        const text = await cloned.text().catch(() => "");
        message = text?.trim() || res.statusText || "Invalid 2FA code.";
      }
      if (res.status === 429) {
        const ra = res.headers.get("Retry-After");
        const seconds = ra ? Number(ra) : NaN;
        if (!Number.isNaN(seconds) && seconds > 0)
          message = `Too many attempts. Try again in ${seconds}s`;
      }
      toast.error(message);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [canVerify2FA, loading, router, twoFAToken]);

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background text-foreground">
      <div className="flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex justify-between items-center">
              Login
              <ThemeButton />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div>
                <Input
                  {...register("emailOrUsername")}
                  id="emailOrUsername"
                  name="emailOrUsername"
                  placeholder="Email or Username"
                  autoComplete="username email"
                  aria-invalid={!!errors.emailOrUsername}
                  aria-describedby={
                    errors.emailOrUsername ? "emailOrUsername-error" : undefined
                  }
                  disabled={loading}
                />
                {errors.emailOrUsername && (
                  <p
                    id="emailOrUsername-error"
                    className="text-red-500 text-xs mt-1"
                  >
                    {errors.emailOrUsername.message}
                  </p>
                )}
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  id="password"
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xl select-none bg-transparent border-none p-0 m-0 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  {showPassword ? "🐵" : "🙈"}
                </button>
                {errors.password && (
                  <p id="password-error" className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button className="w-full" disabled={loading} aria-busy={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>

              <div className="flex justify-between items-center">
                <Button
                  variant="link"
                  className="p-1"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/request-password");
                  }}
                  disabled={loading}
                >
                  Forgot password?
                </Button>
                <Button
                  variant="link"
                  className="p-1"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/register");
                  }}
                  disabled={loading}
                >
                  Don&apos;t have an account?
                </Button>
              </div>

              <Dialog open={twoFAOpen} onOpenChange={setTwoFAOpen}>
                <DialogContent className="bg-zinc-900 text-white">
                  <DialogHeader>
                    <DialogTitle>Enter 2FA Code</DialogTitle>
                  </DialogHeader>

                  <InputOTP
                    maxLength={6}
                    value={twoFAToken}
                    onChange={(value) => {
                      setTwoFAToken(value.replace(/\D/g, "").slice(0, 6));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        verify2FA();
                      }
                    }}
                    placeholder="6-digit TOTP code"
                    aria-label="6-digit TOTP code"
                    aria-invalid={!canVerify2FA && twoFAToken.length > 0}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  <Button
                    onClick={verify2FA}
                    disabled={!canVerify2FA || loading}
                    aria-busy={loading}
                  >
                    Verify
                  </Button>
                </DialogContent>
              </Dialog>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:flex items-center justify-center relative overflow-hidden">
        <Image
          src={bgImage}
          alt="Auth Background"
          fill
          priority
          placeholder="blur"
          sizes="(min-width: 768px) 50vw, 100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background" />
        <div className="flex flex-col items-center justify-center relative bg-secondary/40 backdrop-blur-md p-4 rounded-lg">
          <h1 className="flex items-center justify-center text-3xl font-bold">
            Welcome back to {config?.appName}
          </h1>
          <span className="text-center text-muted-foreground">
            Please enter your credentials to access your account.
          </span>
          <span className="text-center text-muted-foreground">
            If you don&apos;t have an account, please register.
          </span>

          <span className="text-center text-muted-foreground">
            If you are facing any issues, please contact support{" "}
            <Link href={`mailto:${config?.supportEmail}`}>
              {config?.supportEmail}
            </Link>
            .
          </span>
        </div>
      </div>
    </div>
  );
}
