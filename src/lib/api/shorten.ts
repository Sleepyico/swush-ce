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
import { and, desc, ilike, eq, SQL, or } from "drizzle-orm";
import { shortLinks, type DBShortLink, type NewDBShortLink } from "@/db/schema";
import { generateFunnySlug } from "../funny-slug";
import { hashPassword } from "./helpers";

export type CreateShortLinkInput = {
  userId: string;
  originalUrl: string;
  slug?: string | null;
  isPublic?: boolean;
  isFavorite?: boolean;
  description?: string | null;
  password?: string | null;
  maxClicks?: number | null;
  expiresAt?: Date | null;
  clickCount?: number | null;
};

export async function createShortLink(
  input: CreateShortLinkInput,
  username?: string,
  role?: string
): Promise<DBShortLink> {
  let slug = input.slug ?? null;
  if (!input.slug || input.slug.trim() === "") {
    slug = await generateFunnySlug("shortLinks");
  } else if (role === "owner") {
    slug = input.slug.trim();
  } else {
    const desired = input.slug.trim();
    const prefix = `${username}-`;
    slug = desired.startsWith(prefix) ? desired : `${prefix}${desired}`;
  }

  const passwordHash = input.password
    ? await hashPassword(input.password)
    : null;
  const value: NewDBShortLink = {
    userId: input.userId,
    description: input.description ?? null,
    originalUrl: input.originalUrl,
    isFavorite: input.isFavorite ?? false,
    isPublic: input.isPublic ?? false,
    maxClicks: input.maxClicks ?? null,
    expiresAt: input.expiresAt ?? null,
    clickCount: input.clickCount ?? null,
    slug,
    password: passwordHash,
  };
  const [row] = await db.insert(shortLinks).values(value).returning();
  return row as DBShortLink;
}

export type UpdateShortLinkInput = Partial<
  Pick<
    NewDBShortLink,
    | "originalUrl"
    | "description"
    | "isPublic"
    | "isFavorite"
    | "maxClicks"
    | "expiresAt"
    | "slug"
    | "clickCount"
  >
> & { password?: string | null };

export async function updateShortLink(
  userId: string,
  id: string,
  patch: UpdateShortLinkInput,
  username?: string,
  role?: string
) {
  const existing = await db.query.shortLinks.findFirst({
    where: and(eq(shortLinks.id, id), eq(shortLinks.userId, userId)),
  });
  if (!existing) throw new Error("Not found or not yours");

  let passwordHash = existing.password;
  if (patch.password !== undefined)
    passwordHash = patch.password ? await hashPassword(patch.password) : null;

  if (!patch.slug || patch.slug.trim() === "") {
    patch.slug = await generateFunnySlug("shortLinks");
  } else if (role === "owner") {
    patch.slug = patch.slug.trim();
  } else {
    const desired = patch.slug.trim();
    const prefix = `${username}-`;
    if (desired === existing.slug || desired.startsWith(prefix)) {
      patch.slug = desired;
    } else {
      patch.slug = `${prefix}${desired}`;
    }
  }

  const next = {
    originalUrl: patch.originalUrl ?? existing.originalUrl,
    description: patch.description ?? existing.description,
    slug: patch.slug?.trim() || existing.slug,
    isFavorite: patch.isFavorite ?? existing.isFavorite,
    isPublic: patch.isPublic ?? existing.isPublic,
    maxClicks:
      patch.maxClicks !== undefined ? patch.maxClicks : existing.maxClicks,
    expiresAt:
      patch.expiresAt !== undefined ? patch.expiresAt : existing.expiresAt,
    clickCount:
      patch.clickCount !== undefined ? patch.clickCount : existing.clickCount,
    password: passwordHash,
  } as Partial<typeof shortLinks.$inferInsert>;

  const [row] = await db
    .update(shortLinks)
    .set(next)
    .where(and(eq(shortLinks.id, id), eq(shortLinks.userId, userId)))
    .returning();
  return row as DBShortLink;
}

export async function deleteShortLink(userId: string, id: string) {
  await db
    .delete(shortLinks)
    .where(and(eq(shortLinks.id, id), eq(shortLinks.userId, userId)));
}

export async function getShortLinkById(userId: string, id: string) {
  return db.query.shortLinks.findFirst({
    where: and(eq(shortLinks.id, id), eq(shortLinks.userId, userId)),
  });
}

export async function listShortLinks(
  userId: string,
  q?: string,
  opts?: { favoriteOnly?: boolean; publicOnly?: boolean }
) {
  const whereParts: (SQL<unknown> | undefined)[] = [
    eq(shortLinks.userId, userId),
  ];

  if (opts?.favoriteOnly) {
    whereParts.push(eq(shortLinks.isFavorite, true));
  }
  if (opts?.publicOnly) {
    whereParts.push(eq(shortLinks.isPublic, true));
  }

  if (q && q.trim()) {
    const pattern = `%${q.trim()}%`;
    whereParts.push(
      or(
        ilike(shortLinks.description, pattern),
        ilike(shortLinks.originalUrl, pattern)
      )
    );
  }

  return db
    .select()
    .from(shortLinks)
    .where(and(...whereParts))
    .orderBy(desc(shortLinks.createdAt));
}

export async function getPublicShortLinkBySlug(slug: string) {
  return db.query.shortLinks.findFirst({
    where: and(eq(shortLinks.slug, slug), eq(shortLinks.isPublic, true)),
  });
}
