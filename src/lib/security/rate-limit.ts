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

import "server-only";
import { db } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type RateLimitArgs = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  hits: number;
  retryAfter: number;
};

export async function rateLimit({
  key,
  limit,
  windowMs,
}: RateLimitArgs): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  await db
    .insert(rateLimits)
    .values({ key, hits: 1, createdAt: now })
    .onConflictDoNothing();

  const updated = await db
    .update(rateLimits)
    .set({
      hits: sql`CASE WHEN ${rateLimits.createdAt} < ${windowStart}::timestamptz THEN 1 ELSE ${rateLimits.hits} + 1 END`,
      createdAt: sql`CASE WHEN ${rateLimits.createdAt} < ${windowStart}::timestamptz THEN ${now}::timestamptz ELSE ${rateLimits.createdAt} END`,
    })
    .where(eq(rateLimits.key, key))
    .returning({ hits: rateLimits.hits, createdAt: rateLimits.createdAt });

  let hits: number;
  let createdAt: Date;
  if (updated.length === 0) {
    await db
      .insert(rateLimits)
      .values({ key, hits: 1, createdAt: now })
      .onConflictDoNothing();
    const row = await db.query.rateLimits.findFirst({
      where: eq(rateLimits.key, key),
    });
    hits = (row?.hits ?? 1) as number;
    createdAt = (row?.createdAt ?? now) as Date;
  } else {
    hits = updated[0].hits as number;
    createdAt = updated[0].createdAt as Date;
  }

  const windowEnd = new Date(createdAt.getTime() + windowMs);
  const retryAfterMs = Math.max(0, windowEnd.getTime() - now.getTime());
  const success = hits <= limit;

  return {
    success,
    hits,
    retryAfter: Math.ceil(retryAfterMs / 1000),
  };
}
