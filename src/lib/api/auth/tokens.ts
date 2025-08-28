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
import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "@/db/client";
import { apiTokens, type DBApiToken } from "@/db/schema";
import { getUser } from "@/lib/auth/auth";

function toDateOrNull(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export async function listApiTokens() {
  const user = await getUser();
  if (!user) return { status: 401, body: { message: "Unauthorized" } } as const;

  const tokens = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, user.id));

  return { status: 200, body: { tokens } } as const;
}

export async function createApiToken(req: Request) {
  const user = await getUser();
  if (!user) return { status: 401, body: { message: "Unauthorized" } } as const;

  const json = await req.json().catch(() => ({}));
  const name = (json?.name ?? "").toString().trim();
  const expiresInDaysRaw = json?.expiresInDays;
  const expiresInDays =
    expiresInDaysRaw === undefined || expiresInDaysRaw === null
      ? undefined
      : Number(expiresInDaysRaw);

  if (!name)
    return { status: 400, body: { message: "Name is required" } } as const;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt =
    typeof expiresInDays === "number" && Number.isFinite(expiresInDays)
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const [row] = await db
    .insert(apiTokens)
    .values({
      name,
      userId: user.id,
      token,
      expiresAt,
    })
    .returning();

  return { status: 200, body: { token: row.token } } as const;
}

export async function updateApiToken(req: Request) {
  const user = await getUser();
  if (!user) return { status: 401, body: { message: "Unauthorized" } } as const;

  const { id, name, expiryDate } = (await req.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    expiryDate?: string | Date | null;
  };

  if (!id) return { status: 400, body: { message: "Missing id" } } as const;

  const tokenRecord = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!tokenRecord)
    return { status: 404, body: { message: "Token not found" } } as const;
  if (tokenRecord.userId !== user.id)
    return { status: 403, body: { message: "Forbidden" } } as const;

  type ApiTokenUpdate = Partial<Pick<DBApiToken, "name" | "expiresAt">>;
  const updateData: ApiTokenUpdate = {};

  if (typeof name === "string") updateData.name = name.trim();
  const expires = toDateOrNull(expiryDate);
  if (expires !== undefined) updateData.expiresAt = expires;

  if (Object.keys(updateData).length === 0)
    return {
      status: 400,
      body: { message: "No valid fields to update" },
    } as const;

  await db.update(apiTokens).set(updateData).where(eq(apiTokens.id, id));
  return { status: 200, body: { success: true } } as const;
}

export async function deleteOrClearApiTokens(req: Request) {
  const user = await getUser();
  if (!user) return { status: 401, body: { message: "Unauthorized" } } as const;

  const { id, clearRevoked } = (await req.json().catch(() => ({}))) as {
    id?: string;
    clearRevoked?: boolean;
  };

  try {
    if (clearRevoked) {
      await db
        .delete(apiTokens)
        .where(
          and(eq(apiTokens.userId, user.id), eq(apiTokens.isRevoked, true))
        );
      return { status: 200, body: { success: true, cleared: true } } as const;
    }

    if (!id) return { status: 400, body: { message: "Missing id" } } as const;

    await db
      .update(apiTokens)
      .set({ isRevoked: true })
      .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, user.id)));

    return { status: 200, body: { success: true } } as const;
  } catch {
    return {
      status: 500,
      body: { message: "Failed to update tokens" },
    } as const;
  }
}
