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
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { eq, and, gt, ne } from "drizzle-orm";
import { sessionTable } from "@/db/schema";
import { getUser } from "@/lib/auth/auth";
import { lucia } from "./lucia";

export async function getCurrentSessionId(): Promise<string | null> {
  const c = await cookies();
  const cookieName = lucia.sessionCookieName;
  const sid = c.get(cookieName)?.value ?? null;
  return sid || null;
}

export async function listMySessions() {
  const user = await getUser();
  if (!user) return { status: 401 as const, body: { message: "Unauthorized" } };

  const now = new Date();
  const currentId = await getCurrentSessionId();

  const rows = await db
    .select({
      id: sessionTable.id,
      userId: sessionTable.userId,
      expiresAt: sessionTable.expiresAt,
      ip: sessionTable.ipAddress,
      userAgent: sessionTable.userAgent,
    })
    .from(sessionTable)
    .where(
      and(eq(sessionTable.userId, user.id), gt(sessionTable.expiresAt, now))
    );

  const sessions = rows.map((r) => ({
    id: r.id,
    expiresAt: r.expiresAt ?? null,
    ip: r.ip ?? null,
    userAgent: r.userAgent ?? null,
    current: r.id === currentId,
  }));

  return { status: 200 as const, body: sessions };
}

export async function revokeSessionById(idOrKeyword: string) {
  const user = await getUser();
  if (!user) return { status: 401 as const, body: { message: "Unauthorized" } };

  const currentId = await getCurrentSessionId();
  const targetId = idOrKeyword === "current" ? currentId : idOrKeyword;
  if (!targetId)
    return { status: 400 as const, body: { message: "No session id" } };

  const found = await db
    .select({ id: sessionTable.id, userId: sessionTable.userId })
    .from(sessionTable)
    .where(eq(sessionTable.id, targetId))
    .limit(1);
  if (!found.length || found[0].userId !== user.id) {
    return { status: 404 as const, body: { message: "Session not found" } };
  }

  await lucia.invalidateSession(targetId);

  if (currentId && targetId === currentId) {
    const c = await cookies();
    c.set(lucia.sessionCookieName, "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });
  }

  return { status: 200 as const, body: { message: "Revoked" } };
}

export async function revokeOtherSessions() {
  const user = await getUser();
  if (!user) return { status: 401 as const, body: { message: "Unauthorized" } };

  const currentId = await getCurrentSessionId();

  const now = new Date();
  const others = await db
    .select({ id: sessionTable.id })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, user.id),
        gt(sessionTable.expiresAt, now),
        currentId ? ne(sessionTable.id, currentId) : gt(sessionTable.id, "")
      )
    );

  if (!others.length) {
    return { status: 200 as const, body: { message: "No other sessions" } };
  }

  await Promise.all(others.map((s) => lucia.invalidateSession(s.id)));

  return {
    status: 200 as const,
    body: { message: "Revoked other sessions", count: others.length },
  };
}
