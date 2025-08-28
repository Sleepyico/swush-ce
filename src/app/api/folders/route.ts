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
import { files, folders } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { count, sum } from "drizzle-orm/sql/functions";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: folders.id,
      name: folders.name,
      fileCount: count(files.id).mapWith(Number),
      totalSize: sum(files.size).mapWith(Number),
    })
    .from(folders)
    .leftJoin(
      files,
      and(eq(files.folderId, folders.id), eq(files.userId, user.id))
    )
    .where(eq(folders.userId, user.id))
    .groupBy(folders.id, folders.name)
    .orderBy(sql`lower(${folders.name})`);

  const [unfiled] = await db
    .select({
      fileCount: count(files.id).mapWith(Number),
      totalSize: sum(files.size).mapWith(Number),
    })
    .from(files)
    .where(and(eq(files.userId, user.id), isNull(files.folderId)));

  const result = [
    ...(unfiled && (unfiled.fileCount ?? 0) > 0
      ? [
          {
            id: "unfiled",
            name: "Unfiled",
            fileCount: unfiled.fileCount || 0,
            totalSize: unfiled.totalSize || 0,
          },
        ]
      : []),
    ...rows.map((r) => ({
      id: r.id,
      name: r.name,
      fileCount: r.fileCount || 0,
      totalSize: r.totalSize || 0,
    })),
  ];

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = 10;
  const userLimit = 5;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `user:${user.id}:folder-create`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many folder create attempts. Try again in ${retry}s` },
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
      { message: "Folder name is required" },
      { status: 400 }
    );
  }

  const name = body.name.trim();
  if (!name) {
    return NextResponse.json(
      { message: "Invalid folder name" },
      { status: 400 }
    );
  }

  const exists = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.userId, user.id), eq(folders.name, name)))
    .limit(1);

  if (exists.length > 0) {
    return NextResponse.json(
      { message: "Folder already exists" },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(folders)
    .values({ userId: user.id, name })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = 20;
  const userLimit = 15;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const usrRL = await rateLimit({
    key: `user:${user.id}:folder-update`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many folder update attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const nameRaw = body?.name;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { message: "Folder id is required" },
      { status: 400 }
    );
  }

  if (!nameRaw || typeof nameRaw !== "string") {
    return NextResponse.json(
      { message: "Folder name is required" },
      { status: 400 }
    );
  }

  const name = nameRaw.trim();
  if (!name) {
    return NextResponse.json(
      { message: "Invalid folder name" },
      { status: 400 }
    );
  }

  const existingFolder = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, user.id)))
    .limit(1);

  if (existingFolder.length === 0) {
    return NextResponse.json({ message: "Folder not found" }, { status: 404 });
  }

  const nameClash = await db
    .select({ id: folders.id })
    .from(folders)
    .where(
      and(
        eq(folders.userId, user.id),
        eq(folders.name, name),
        sql`${folders.id} <> ${id}`
      )
    )
    .limit(1);

  if (nameClash.length > 0) {
    return NextResponse.json(
      { message: "Another folder with this name already exists" },
      { status: 409 }
    );
  }

  const [updated] = await db
    .update(folders)
    .set({ name })
    .where(and(eq(folders.id, id), eq(folders.userId, user.id)))
    .returning();

  return NextResponse.json(updated, { status: 200 });
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
    key: `user:${user.id}:folder-delete`,
    limit: userLimit,
    windowMs,
  });

  if (!ipRL.success || !usrRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, usrRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many folder delete attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const body = await req.json().catch(() => null);
  const id = body?.id;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { message: "Folder id is required" },
      { status: 400 }
    );
  }

  const owned = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, user.id)))
    .limit(1);

  if (owned.length === 0) {
    return NextResponse.json({ message: "Folder not found" }, { status: 404 });
  }

  await db
    .update(files)
    .set({ folderId: null })
    .where(and(eq(files.folderId, id), eq(files.userId, user.id)));

  await db
    .delete(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, user.id)));

  return NextResponse.json({ success: true });
}
