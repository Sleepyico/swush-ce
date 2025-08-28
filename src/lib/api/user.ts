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
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth/auth";
import { lucia } from "@/lib/auth/lucia";
import { z } from "zod";
import { getRemainingSummary } from "@/lib/security/policy";
import { hashPassword } from "./helpers";
import { getServerSettings, isUsernamePreserved } from "../settings";

const PatchSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9._-]+$/i)
    .optional(),
  displayName: z.string().trim().max(64).nullable().optional(),
});

export async function getProfile() {
  const u = await getUser();
  const userId = u?.id;
  if (!userId)
    return { status: 401, body: { message: "Unauthorized" } } as const;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return { status: 404, body: { message: "Not found" } } as const;
  return { status: 200, body: row } as const;
}

export async function patchProfile(req: Request) {
  const me = await getUser();
  const userId = me?.id;
  if (!userId)
    return { status: 401, body: { message: "Unauthorized" } } as const;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success)
    return { status: 400, body: { message: "Invalid data" } } as const;

  const updates: Partial<
    Pick<typeof users.$inferInsert, "username" | "displayName">
  > = {};
  if (typeof parsed.data.username !== "undefined")
    updates.username = parsed.data.username.toLowerCase();
  if ("displayName" in parsed.data)
    updates.displayName = parsed.data.displayName ?? null;
  if (Object.keys(updates).length === 0)
    return { status: 400, body: { message: "Nothing to update" } } as const;

  if (updates.username) {
    const s = await getServerSettings();
    if (isUsernamePreserved(updates.username, s)) {
      return {
        status: 400,
        body: { message: "Username is reserved" },
      } as const;
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, updates.username))
      .limit(1);
    if (existing.length && existing[0].id !== userId) {
      return {
        status: 409,
        body: { message: "Username is already taken" },
      } as const;
    }
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
    });

  return { status: 200, body: updated } as const;
}

export async function changePassword(req: NextRequest) {
  const { currentPassword, newPassword } = (await req
    .json()
    .catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword)
    return { status: 400, body: { message: "Missing fields." } } as const;

  if (newPassword.length < 8)
    return {
      status: 400,
      body: { message: "New password must be at least 8 characters." },
    } as const;

  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value;
  if (!sessionId)
    return { status: 401, body: { message: "Unauthorized" } } as const;

  const { user } = await lucia.validateSession(sessionId);
  if (!user)
    return { status: 401, body: { message: "Invalid session" } } as const;

  const [foundUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  if (!foundUser)
    return { status: 404, body: { message: "User not found" } } as const;

  const isMatch = await compare(currentPassword, foundUser.hashedPassword);

  if (!isMatch)
    return {
      status: 401,
      body: { message: "Current password is incorrect." },
    } as const;

  const hashed = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ hashedPassword: hashed })
    .where(eq(users.id, user.id));

  return {
    status: 200,
    body: { message: "Password changed successfully." },
  } as const;
}

export async function getSummary() {
  const user = await getUser();
  if (!user) return { status: 401, body: { error: "Unauthorized" } } as const;
  const summary = await getRemainingSummary(user.id, user.role);
  return { status: 200, body: summary } as const;
}
