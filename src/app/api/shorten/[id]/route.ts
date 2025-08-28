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
import { getUser } from "@/lib/auth/auth";
import {
  deleteShortLink,
  getShortLinkById,
  updateShortLink,
} from "@/lib/api/shorten";

import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await getShortLinkById(user.id, id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: row });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = 20;
  const userLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `u:${user.id}`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many update attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const body = await req.json();
  const data = await updateShortLink(
    user.id,
    id,
    {
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

  const okRes = NextResponse.json({ data });
  okRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
  okRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return okRes;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(_req);
  const ipLimit = 20;
  const userLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `u:${user.id}`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many delete attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  await deleteShortLink(user.id, id);

  const okRes = NextResponse.json({ ok: true });
  okRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
  okRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return okRes;
}
