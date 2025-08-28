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

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";
import { getUser } from "@/lib/auth/auth";
import { db } from "@/db/client";
import { files } from "@/db/schema";
import { and, or, ilike, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ groups: [] });

  const ip = getClientIp(req);
  const ipRL = await rateLimit({
    key: `ip:${ip}:global-search`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!ipRL.success) {
    const retry = ipRL.retryAfter ?? 30;
    const res = NextResponse.json(
      { message: `Slow down. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(retry));
    return res;
  }

  const take = 5;
  const [fileRows] = await Promise.all([
    db.query.files.findMany({
      where: and(
        eq(files.userId, user.id),
        or(ilike(files.originalName, `%${q}%`), ilike(files.slug, `%${q}%`))
      ),
      columns: { id: true, originalName: true, slug: true },
      limit: take,
    }),
  ]);

  const groups = [
    {
      label: "Files",
      items: fileRows.map((f) => ({
        id: f.id,
        title: f.originalName as string,
        subtitle: f.slug as string,
        type: "file",
        href: `/vault?focusId=${f.id}`,
      })),
    },
  ].filter((g) => g.items.length);

  return NextResponse.json({ groups });
}
