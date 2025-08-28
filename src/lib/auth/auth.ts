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
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lucia } from "./lucia";

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: "user" | "admin" | "owner";
  filesLimit: number | null;
  shortLinksLimit: number | null;
  maxUploadMb: number;
  maxStorageMb: number;
};

function toAuthUser(u: typeof users.$inferSelect): AuthUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username ?? null,
    displayName: u.displayName ?? null,
    role: (u.role as AuthUser["role"]) ?? "user",
    filesLimit: u.filesLimit ?? null,
    shortLinksLimit: u.shortLinksLimit ?? null,
    maxUploadMb: u.maxUploadMb ?? 0,
    maxStorageMb: u.maxStorageMb ?? 0,
  };
}

export async function getUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value;

  if (!sessionId) return null;

  const { session, user: luciaUser } = await lucia.validateSession(sessionId);

  if (!session || !luciaUser) {
    try {
      await lucia.invalidateSession(sessionId);
    } catch {
      console.error("Failed to invalidate session:", sessionId);
    }
    return null;
  }

  const row = await db
    .select()
    .from(users)
    .where(eq(users.id, luciaUser.id))
    .limit(1);

  const u = row[0];
  if (!u) {
    try {
      await lucia.invalidateSession(sessionId);
    } catch {
      console.error("Failed to invalidate session:", sessionId);
    }
    return null;
  }

  if (u.isLocked) {
    try {
      await lucia.invalidateSession(sessionId);
    } catch {
      console.error("Failed to invalidate session:", sessionId);
    }
    return null;
  }

  return toAuthUser(u);
}

export async function getUserFromToken(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  const tokenRow = await db.query.apiTokens.findFirst({
    where: (t, { eq }) => eq(t.token, token),
  });

  if (!tokenRow || tokenRow.isRevoked) return null;
  if (tokenRow.expiresAt && tokenRow.expiresAt < new Date()) return null;

  const row = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenRow.userId))
    .limit(1);

  const u = row[0];
  if (!u) return null;
  if (u.isLocked) return null;

  return toAuthUser(u);
}
