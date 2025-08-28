/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserFromToken } from "@/lib/auth/auth";
import { enforceCreateLimit, LimitPolicyError } from "@/lib/security/policy";
import { createShortLink, listShortLinks } from "@/lib/api/shorten";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

export async function GET(req: NextRequest) {
  let user = await getUser();
  if (!user) user = await getUserFromToken(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const favoriteOnly = ["1", "true", "yes"].includes(
    (searchParams.get("favorite") || "").toLowerCase()
  );
  const publicOnly = ["1", "true", "yes"].includes(
    (searchParams.get("public") || "").toLowerCase()
  );

  const rows = await listShortLinks(user.id, q, { favoriteOnly, publicOnly });

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  let user = await getUser();
  if (!user) user = await getUserFromToken(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = 15;
  const userLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `u:${user.id}:shortlink-create`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many shortlink create attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  try {
    await enforceCreateLimit({
      userId: user.id,
      role: user.role,
      kind: "shortLink",
    });

    const body = await req.json();
    const row = await createShortLink(
      {
        userId: user.id,
        originalUrl: body.originalUrl,
        description: body.description,
        maxClicks: body.maxClicks,
        clickCount: body.clickCount,
        expiresAt: body.expiresAt,
        slug: body.slug,
        isPublic: body.isPublic,
        isFavorite: body.isFavorite,
        password: body.password,
      },
      user.username!,
      user.role
    );

    const res = NextResponse.json({ data: row }, { status: 201 });
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
    return res;
  } catch (e) {
    if (e instanceof LimitPolicyError) {
      const res = NextResponse.json({ error: e.message }, { status: 429 });
      res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
      res.headers.set("RateLimit-Remaining", "0");
      res.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
      res.headers.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res;
    }

    throw e;
  }
}
