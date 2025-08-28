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

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/auth";
import { db } from "@/db/client";
import { tags, filesToTags } from "@/db/schema";
import { and, eq } from "drizzle-orm";

import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(tags)
    .where(eq(tags.userId, user.id))
    .orderBy(tags.name);

  const getRes = NextResponse.json(list);
  return getRes;
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = 20;
  const userLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `u:${user.id}:tag-create`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many tag create attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json(
      { message: "Tag name is required" },
      { status: 400 }
    );
  }

  const name = body.name.trim().toLowerCase();
  if (!name) {
    return NextResponse.json({ message: "Invalid tag name" }, { status: 400 });
  }

  const exists = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, user.id), eq(tags.name, name)))
    .limit(1);

  if (exists.length > 0) {
    return NextResponse.json(
      { message: "Tag already exists" },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(tags)
    .values({
      userId: user.id,
      name,
    })
    .returning();

  const postRes = NextResponse.json(created, { status: 201 });
  postRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
  postRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return postRes;
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = 20;
  const userLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `u:${user.id}:tag-update`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many tag update attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.id !== "string" ||
    !body.id ||
    typeof body.name !== "string" ||
    !body.name.trim()
  ) {
    return NextResponse.json(
      { message: "Tag id and name are required" },
      { status: 400 }
    );
  }

  const id = body.id;
  const name = body.name.trim().toLowerCase();

  const duplicate = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, user.id), eq(tags.name, name)))
    .limit(1);

  if (duplicate.length > 0) {
    return NextResponse.json(
      { message: "Tag already exists" },
      { status: 409 }
    );
  }

  const [updated] = await db
    .update(tags)
    .set({ name })
    .where(and(eq(tags.id, id), eq(tags.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ message: "Tag not found" }, { status: 404 });
  }

  const patchRes = NextResponse.json(updated);
  patchRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
  patchRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return patchRes;
}

export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = 20;
  const userLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `u:${user.id}:tag-delete`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many tag delete attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !body.id) {
    return NextResponse.json(
      { message: "Tag id is required" },
      { status: 400 }
    );
  }

  const id = body.id;

  await db.delete(filesToTags).where(eq(filesToTags.tagId, id));

  const [deleted] = await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ message: "Tag not found" }, { status: 404 });
  }

  const delRes = NextResponse.json(deleted);
  delRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
  delRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return delRes;
}
