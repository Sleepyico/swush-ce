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

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import bgImage from "../../../public/images/bg.png";
import ThemeButton from "../Common/ThemeButton";
import Link from "next/link";
import { useConfig } from "@/hooks/use-config";

export default function RegisterClient() {
  const config = useConfig();
  const params = useSearchParams();
  const inviteToken = params.get("invite");

  const router = useRouter();

  const [minLength, setMinLength] = useState<number>(8);

  const schema = useMemo(
    () =>
      z
        .object({
          email: z
            .string()
            .email()
            .transform((val) => val.toLowerCase()),
          username: z
            .string()
            .min(3)
            .max(32)
            .transform((val) => val.toLowerCase()),
          password: z.string().min(minLength),
          repeatPassword: z.string().min(minLength),
        })
        .refine((data) => data.password === data.repeatPassword, {
          message: "Passwords do not match",
          path: ["repeatPassword"],
        }),
    [minLength]
  );

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const [allowPublicRegistration, setAllowPublicRegistration] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/register/status");
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setAllowPublicRegistration(data.allowPublicRegistration);
            setMinLength(data.passwordPolicyMinLength);
          }
        } else {
          if (active) setAllowPublicRegistration(true);
        }
      } catch {
        if (active) setAllowPublicRegistration(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        password: data.password,
        invite: inviteToken,
      }),
    });

    const json = await res.json();

    if (res.ok) {
      router.push("/vault");
    } else {
      toast.error(json.message || "Registration failed");
    }

    setLoading(false);
  };

  const registrationBlocked = allowPublicRegistration === false && !inviteToken;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background text-foreground">
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
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background" />
        <div className="flex flex-col items-center justify-center relative bg-secondary/40 backdrop-blur-md p-4 rounded-lg">
          <h1 className="relative text-3xl font-bold tracking-tight text-center px-6">
            Welcome to {config?.appName}
          </h1>
          <span className="text-center text-muted-foreground">
            Please enter your credentials to create your account.
          </span>
          <span className="text-center text-muted-foreground">
            If you have have an account, please login.
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
      <div className="flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex justify-between items-center">
              Register an Account
              <ThemeButton />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allowPublicRegistration === false && !inviteToken && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                Registration is currently closed.
              </div>
            )}
            {allowPublicRegistration === false && inviteToken && (
              <div className="mb-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm">
                Registration is closed, but your invite is valid. You can
                register now.
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  {...register("email")}
                  placeholder="Email"
                  disabled={loading || registrationBlocked}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Input
                  {...register("username")}
                  placeholder="Username"
                  disabled={loading || registrationBlocked}
                />
                {errors.username && (
                  <p className="text-red-500 text-xs">
                    {errors.username.message}
                  </p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Password"
                  disabled={loading || registrationBlocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xl select-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "🐵"}
                </button>
                {errors.password && (
                  <p className="text-red-500 text-xs">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showRepeatPassword ? "text" : "password"}
                  {...register("repeatPassword")}
                  placeholder="Repeat Password"
                  disabled={loading || registrationBlocked}
                />
                <button
                  type="button"
                  onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xl select-none"
                  tabIndex={-1}
                  aria-label={
                    showRepeatPassword
                      ? "Hide repeat password"
                      : "Show repeat password"
                  }
                >
                  {showRepeatPassword ? "🙈" : "🐵"}
                </button>
                {errors.repeatPassword && (
                  <p className="text-red-500 text-xs">
                    {errors.repeatPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || registrationBlocked}
              >
                {loading ? "Registering..." : "Register"}
              </Button>
              <Button
                variant="link"
                className="p-1"
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/login");
                }}
                disabled={loading}
              >
                Already have an account?
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
