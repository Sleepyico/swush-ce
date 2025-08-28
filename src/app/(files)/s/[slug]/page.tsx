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

import { db } from "@/db/client";
import { shortLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { defaultMetadata } from "@/lib/head";
import ExternalLayout from "@/components/Common/ExternalLayout";
import { APP_URL } from "@/lib/constant";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;

  return {
    ...defaultMetadata,
    title: `Swush • ${slug}`,
    description: `Redirects to something special for ${slug}`,
    openGraph: {
      ...(defaultMetadata.openGraph ?? {}),
      title: `Swush • ${slug}`,
      description: `Redirects to something special for ${slug}`,
      url: `${APP_URL}/s/${slug}`,
    },
    twitter: {
      ...(defaultMetadata.twitter ?? {}),
      title: `Swush • ${slug}`,
      description: `Redirects to something special for ${slug}`,
    },
  };
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function ShortLinkPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const { password } = sp;

  const link = await db.query.shortLinks.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });

  if (!link || !link.originalUrl) {
    notFound();
  }

  if (!link.isPublic) {
    return (
      <ExternalLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>🔒 Private Link</CardTitle>
            <CardDescription>This link is private.</CardDescription>
          </CardHeader>
        </Card>
      </ExternalLayout>
    );
  }

  if (link.expiresAt instanceof Date) {
    const now = new Date();
    if (link.expiresAt <= now) {
      return (
        <ExternalLayout>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Link expired</CardTitle>
              <CardDescription>
                This short link is no longer available.
              </CardDescription>
            </CardHeader>
          </Card>
        </ExternalLayout>
      );
    }
  }

  if (
    typeof link.maxClicks === "number" &&
    typeof link.clickCount === "number"
  ) {
    if (link.maxClicks > 0 && link.clickCount >= link.maxClicks) {
      return (
        <ExternalLayout>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Link unavailable</CardTitle>
              <CardDescription>
                This link reached its maximum number of clicks.
              </CardDescription>
            </CardHeader>
          </Card>
        </ExternalLayout>
      );
    }
  }

  const providedPassword = typeof password === "string" ? password : undefined;

  if (link.password) {
    const wrongPassword =
      providedPassword !== undefined && providedPassword !== link.password;

    if (!providedPassword || wrongPassword) {
      return (
        <ExternalLayout>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>🔒 Password required</CardTitle>
              <CardDescription>
                Enter the password to continue to the destination.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form method="GET" className="grid gap-3">
                {wrongPassword ? (
                  <p className="text-sm text-red-400">
                    Incorrect password. Please try again.
                  </p>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    autoComplete="off"
                  />
                </div>
                <input type="hidden" name="continue" value="1" />
                <Button type="submit" className="mt-2">
                  Continue
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Your password is only used to unlock this link.
              </p>
            </CardFooter>
          </Card>
        </ExternalLayout>
      );
    }
  }

  await db
    .update(shortLinks)
    .set({ clickCount: (link.clickCount || 0) + 1 })
    .where(eq(shortLinks.slug, slug));

  redirect(link.originalUrl);
}
