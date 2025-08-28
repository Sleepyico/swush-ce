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
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getUser, getUserFromToken } from "@/lib/auth/auth";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  files as filesTable,
  folders as foldersTable,
  tags as tagsTable,
  filesToTags as filesToTagsTable,
} from "@/db/schema";
import { getServerSettings } from "@/lib/settings";
import { fileTypeFromBuffer } from "file-type";
import { compare, hash } from "bcryptjs";
import {
  enforceCreateLimit,
  enforceUploadPolicy,
  LimitPolicyError,
} from "@/lib/security/policy";
import { generateFunnySlug } from "../funny-slug";
import { unlink } from "fs/promises";
import {
  files as filesTbl,
  filesToTags as ftTags,
  tags as tagsTbl,
  users as usersTbl,
} from "@/db/schema";

export const UPLOAD_ROOT = (() => {
  const raw = process.env.UPLOAD_ROOT || "uploads";
  const cleaned = raw.trim() || "uploads";
  return path.isAbsolute(cleaned) ? cleaned : path.join(process.cwd(), cleaned);
})();

function fileDiskPath(userId: string, storedName: string) {
  return path.join(UPLOAD_ROOT, userId, storedName);
}

async function findFileByKey(key: string) {
  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      key
    );
  const where = isUuid ? eq(filesTbl.id, key) : eq(filesTbl.slug, key);
  return db.select().from(filesTbl).where(where).limit(1);
}

function safeJoin(base: string, target: string) {
  const targetPath = path.join(base, target);
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export async function listFiles(req: NextRequest) {
  let user = await getUser();
  if (!user) user = await getUserFromToken(req);
  if (!user) return { status: 401 as const, body: { message: "Unauthorized" } };

  try {
    const items = await db
      .select()
      .from(filesTable)
      .where(eq(filesTable.userId, user.id))
      .orderBy(desc(filesTable.createdAt));

    return { status: 200 as const, body: items };
  } catch (err) {
    console.error("Failed to list files:", err);
    return { status: 500 as const, body: { message: "Failed to list files" } };
  }
}

export async function uploadFile(req: NextRequest) {
  let user = await getUser();
  if (!user) user = await getUserFromToken(req);
  if (!user) return { status: 401 as const, body: { message: "Unauthorized" } };

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { status: 400 as const, body: { message: "No file provided" } };
    }

    const settings = await getServerSettings();
    const name = form.get("name");
    const description =
      typeof form.get("description") === "string"
        ? String(form.get("description")).trim()
        : null;
    const isPublicRaw = form.get("isPublic");
    const desiredSlugRaw = form.get("slug");

    const folderIdRaw = form.get("folderId");
    const folderNameRaw = form.get("folderName");

    const tagIdsRaw = form.get("tagIds");
    const newTagsRaw = form.get("newTags");

    const passwordRaw = form.get("password");
    let hashedPassword: string | null = null;
    if (typeof passwordRaw === "string" && passwordRaw.trim()) {
      hashedPassword = await hash(passwordRaw.trim(), 12);
    }

    const desiredSlug =
      typeof desiredSlugRaw === "string" ? desiredSlugRaw.trim() : "";
    const incomingTagIds: string[] =
      typeof tagIdsRaw === "string" && tagIdsRaw.trim()
        ? (JSON.parse(tagIdsRaw) as string[]).filter(
            (s) => typeof s === "string"
          )
        : [];
    const incomingNewTagNames: string[] =
      typeof newTagsRaw === "string" && newTagsRaw.trim()
        ? newTagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    const incomingFolderId =
      typeof folderIdRaw === "string" && folderIdRaw.trim()
        ? folderIdRaw.trim()
        : null;
    const incomingFolderName =
      typeof folderNameRaw === "string" ? folderNameRaw.trim() : "";

    let slug: string | null = null;
    if (!desiredSlug || desiredSlug.trim() === "") {
      slug = await generateFunnySlug("files");
    } else if (user.role === "owner") {
      slug = desiredSlug.trim();
    } else {
      const desired = desiredSlug.trim();
      const prefix = `${user.username}-`;
      slug = desired.startsWith(prefix) ? desired : `${prefix}${desired}`;
    }

    const exists = await db
      .select({ id: filesTable.id })
      .from(filesTable)
      .where(eq(filesTable.slug, slug))
      .limit(1);

    if (exists.length > 0) {
      return { status: 409 as const, body: { message: "Slug already in use" } };
    }

    const originalName = (typeof name === "string" && name.trim()) || file.name;
    const size = file.size ?? 0;

    const mimeType = file.type || "application/octet-stream";
    const ext = (path.extname(file.name) || "").toLowerCase();
    const userDir = safeJoin(UPLOAD_ROOT, user.id);
    await mkdir(userDir, { recursive: true });
    const storedName = `${nanoid()}${ext || ""}`;
    const filePath = safeJoin(userDir, storedName);
    const arrayBuffer = await file.arrayBuffer();

    const buf = Buffer.from(arrayBuffer);
    const sig = await fileTypeFromBuffer(buf);
    const effectiveMime = sig?.mime || mimeType;

    const allowedPrefixes = Array.isArray(settings.allowedMimePrefixes)
      ? settings.allowedMimePrefixes.filter(Boolean)
      : [];
    const disallowedExts = Array.isArray(settings.disallowedExtensions)
      ? settings.disallowedExtensions.map((e) => String(e).toLowerCase())
      : [];

    await enforceCreateLimit({
      userId: user.id,
      role: user.role,
      kind: "files",
    });
    await enforceUploadPolicy({
      userId: user.id,
      role: user.role,
      fileSizesMb: [size / (1024 * 1024)],
    });

    if (allowedPrefixes.length > 0) {
      const ok = allowedPrefixes.some((prefix) =>
        effectiveMime.startsWith(prefix)
      );
      if (!ok) {
        return {
          status: 400 as const,
          body: {
            message: `Uploads of this type are not allowed (${effectiveMime})`,
          },
        };
      }
    }

    if (disallowedExts.length > 0 && disallowedExts.includes(ext)) {
      return {
        status: 400 as const,
        body: { message: `Files with ${ext} extension are not allowed` },
      };
    }

    await writeFile(filePath, Buffer.from(arrayBuffer));

    const isPublic =
      (typeof isPublicRaw === "string" &&
        isPublicRaw.toLowerCase() === "true") ||
      (typeof isPublicRaw === "boolean" && isPublicRaw === true);

    let folderId: string | null = null;
    if (incomingFolderId) {
      const own = await db
        .select({ id: foldersTable.id })
        .from(foldersTable)
        .where(
          and(
            eq(foldersTable.id, incomingFolderId),
            eq(foldersTable.userId, user.id)
          )
        )
        .limit(1);
      if (own.length > 0) folderId = own[0].id;
    }
    if (!folderId && incomingFolderName) {
      const existing = await db
        .select()
        .from(foldersTable)
        .where(
          and(
            eq(foldersTable.userId, user.id),
            eq(foldersTable.name, incomingFolderName)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        folderId = existing[0].id;
      } else {
        const [created] = await db
          .insert(foldersTable)
          .values({ userId: user.id, name: incomingFolderName })
          .returning();
        folderId = created.id;
      }
    }

    const [row] = await db
      .insert(filesTable)
      .values({
        userId: user.id,
        folderId: folderId ?? null,
        originalName,
        storedName,
        mimeType,
        size,
        slug,
        description,
        isPublic,
        password: hashedPassword,
      })
      .returning();

    const verifiedTagIds: string[] = [];
    if (incomingTagIds.length > 0) {
      const existing = await db
        .select({ id: tagsTable.id })
        .from(tagsTable)
        .where(
          and(
            eq(tagsTable.userId, user.id),
            inArray(tagsTable.id, incomingTagIds)
          )
        );
      verifiedTagIds.push(...existing.map((t) => t.id));
    }

    let createdTags: { id: string; name: string }[] = [];
    if (incomingNewTagNames.length > 0) {
      const namesLower = incomingNewTagNames.map((n) => n.toLowerCase());
      const already = namesLower.length
        ? await db
            .select()
            .from(tagsTable)
            .where(
              and(
                eq(tagsTable.userId, user.id),
                inArray(tagsTable.name, incomingNewTagNames)
              )
            )
        : [];
      const alreadySet = new Set(already.map((t) => t.name.toLowerCase()));
      const toCreate = incomingNewTagNames.filter(
        (n) => !alreadySet.has(n.toLowerCase())
      );

      if (toCreate.length > 0) {
        const inserted = await db
          .insert(tagsTable)
          .values(toCreate.map((name) => ({ userId: user.id, name })))
          .returning({ id: tagsTable.id, name: tagsTable.name });
        createdTags = inserted;
      }
      createdTags = [
        ...already.map((t) => ({ id: t.id, name: t.name })),
        ...createdTags,
      ];
    }

    const allTagIds = Array.from(
      new Set([...verifiedTagIds, ...createdTags.map((t) => t.id)])
    );
    if (allTagIds.length > 0) {
      await db
        .insert(filesToTagsTable)
        .values(allTagIds.map((tagId) => ({ fileId: row.id, tagId })));
    }

    const responseTags =
      allTagIds.length > 0
        ? await db
            .select({ id: tagsTable.id, name: tagsTable.name })
            .from(tagsTable)
            .where(inArray(tagsTable.id, allTagIds))
        : [];

    return {
      status: 201 as const,
      body: {
        id: row.id,
        originalName: row.originalName,
        storedName: row.storedName,
        mimeType: row.mimeType,
        size: row.size,
        slug: row.slug,
        description: row.description,
        isPublic: row.isPublic,
        createdAt: row.createdAt,
        folder: incomingFolderName || null,
        tags: responseTags,
        url: `${req.nextUrl.origin}/x/${row.slug}`,
      },
    };
  } catch (err) {
    console.error("Upload failed:", err);
    if (err instanceof LimitPolicyError) {
      return { status: 429 as const, body: { error: err.message } };
    }
    return { status: 500 as const, body: { message: "Upload failed" } };
  }
}

export async function getFile(req: NextRequest, key: string) {
  const rows = await findFileByKey(key);
  if (rows.length === 0)
    return { status: 404 as const, body: { message: "Not found" } };
  const f = rows[0];

  const includeOwner = (req.nextUrl.searchParams.get("include") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .includes("owner");

  if (f.password) {
    const passwordRaw = req.nextUrl.searchParams.get("p");
    if (!passwordRaw || !(await compare(passwordRaw, f.password))) {
      return {
        status: 403 as const,
        body: { message: "Invalid or missing password" },
      };
    }
  }

  if (!f.isPublic) {
    const user = await getUser();
    if (!user || user.id !== f.userId) {
      return { status: 403 as const, body: { message: "Private file" } };
    }
  }

  let ownerUsername: string | null = null;
  let ownerDisplayName: string | null = null;
  if (includeOwner) {
    const owner = await db
      .select({
        username: usersTbl.username,
        displayName: usersTbl.displayName,
      })
      .from(usersTbl)
      .where(eq(usersTbl.id, f.userId))
      .limit(1);
    if (owner.length) {
      ownerUsername = owner[0].username ?? null;
      ownerDisplayName = owner[0].displayName ?? null;
    }
  }

  const tagRows = await db
    .select({ name: tagsTbl.name })
    .from(ftTags)
    .leftJoin(tagsTbl, eq(ftTags.tagId, tagsTbl.id))
    .where(eq(ftTags.fileId, f.id));
  const tagNames = tagRows.map((r) => r.name).filter((n): n is string => !!n);

  return {
    status: 200 as const,
    body: {
      id: f.id,
      slug: f.slug,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      description: f.description,
      createdAt: f.createdAt,
      isPublic: f.isPublic,
      tags: tagNames,
      folderId: f.folderId ?? null,
      ownerUsername,
      ownerDisplayName,
    },
  };
}

export async function patchFile(req: NextRequest, key: string) {
  const rows = await findFileByKey(key);
  const user = await getUser();
  if (!user) return { status: 401 as const, body: { message: "Unauthorized" } };
  if (rows.length === 0)
    return { status: 404 as const, body: { message: "Not found" } };
  const f = rows[0];
  if (f.userId !== user.id)
    return { status: 403 as const, body: { message: "Forbidden" } };

  let body;
  try {
    body = await req.json();
  } catch {
    return { status: 400 as const, body: { message: "Invalid JSON" } };
  }

  const {
    isPublic,
    description,
    originalName,
    folderId,
    addTagIds,
    removeTagIds,
    newSlug,
    password,
  } = (body ?? {}) as Partial<{
    isPublic: boolean | string;
    description: string | null;
    originalName: string;
    folderId: string | null;
    addTagIds: string[];
    removeTagIds: string[];
    newSlug: string;
    password: string | null;
  }>;

  const updateValues: Record<string, unknown> = {};
  const parsedIsPublic =
    typeof isPublic === "string"
      ? isPublic.toLowerCase() === "true"
      : typeof isPublic === "boolean"
      ? isPublic
      : undefined;
  if (typeof parsedIsPublic === "boolean")
    updateValues.isPublic = parsedIsPublic;
  if (typeof description === "string" || description === null)
    updateValues.description = description;
  if (typeof originalName === "string" && originalName.trim())
    updateValues.originalName = originalName.trim();
  if (typeof folderId === "string" || folderId === null)
    updateValues.folderId = folderId ?? null;

  if (typeof newSlug === "string") {
    let candidate = newSlug.trim();

    if (candidate === "") {
      candidate = await generateFunnySlug("files");
    } else if (user.role === "owner") {
      candidate = candidate;
    } else {
      const desired = candidate.trim();
      const prefix = `${user.username}-`;
      if (desired === candidate || desired.startsWith(prefix)) {
        candidate = desired;
      } else {
        candidate = `${prefix}${desired}`;
      }
    }

    if (candidate === f.slug) {
      return { status: 200 as const, body: { message: "No changes made" } };
    }

    const conflict = await db
      .select({ id: filesTbl.id })
      .from(filesTbl)
      .where(eq(filesTbl.slug, candidate))
      .limit(1);
    if (conflict.length && conflict[0].id !== f.id) {
      return { status: 409 as const, body: { message: "Slug already in use" } };
    }

    updateValues.slug = candidate;
  }

  if (typeof password === "string") {
    const p = password.trim();
    updateValues.password = p.length === 0 ? null : await hash(p, 12);
  } else if (password === null) {
    updateValues.password = null;
  }

  if (Object.keys(updateValues).length > 0) {
    await db.update(filesTbl).set(updateValues).where(eq(filesTbl.id, f.id));
  }

  if (Array.isArray(addTagIds) && addTagIds.length > 0) {
    const addSet = Array.from(
      new Set(
        addTagIds.filter(
          (x): x is string => typeof x === "string" && x.length > 0
        )
      )
    );
    if (addSet.length) {
      const owned = await db
        .select({ id: tagsTbl.id })
        .from(tagsTbl)
        .where(and(eq(tagsTbl.userId, user.id), inArray(tagsTbl.id, addSet)));
      const ownedIds = owned.map((t) => t.id);
      if (ownedIds.length) {
        await db
          .insert(ftTags)
          .values(ownedIds.map((tagId) => ({ fileId: f.id, tagId })))
          .onConflictDoNothing();
      }
    }
  }

  if (Array.isArray(removeTagIds) && removeTagIds.length > 0) {
    const remSet = Array.from(
      new Set(
        removeTagIds.filter(
          (x): x is string => typeof x === "string" && x.length > 0
        )
      )
    );
    if (remSet.length) {
      await db
        .delete(ftTags)
        .where(and(eq(ftTags.fileId, f.id), inArray(ftTags.tagId, remSet)));
    }
  }

  const freshRows = await db
    .select()
    .from(filesTbl)
    .where(eq(filesTbl.id, f.id))
    .limit(1);
  const fresh = freshRows[0] ?? f;
  const freshTags = await db
    .select({ name: tagsTbl.name })
    .from(ftTags)
    .leftJoin(tagsTbl, eq(ftTags.tagId, tagsTbl.id))
    .where(eq(ftTags.fileId, fresh.id));
  const freshTagNames = freshTags
    .map((r) => r.name)
    .filter((n): n is string => !!n);

  return {
    status: 200 as const,
    body: { message: "Updated", file: { ...fresh, tags: freshTagNames } },
  };
}

export async function deleteFile(req: NextRequest, key: string) {
  const rows = await findFileByKey(key);
  const user = await getUser();
  if (!user) return { status: 401 as const, body: { message: "Unauthorized" } };
  if (rows.length === 0)
    return { status: 404 as const, body: { message: "Not found" } };
  const f = rows[0];
  if (f.userId !== user.id)
    return { status: 403 as const, body: { message: "Forbidden" } };

  await db.delete(filesTbl).where(eq(filesTbl.id, f.id));

  try {
    if (f.storedName) {
      await unlink(fileDiskPath(f.userId, f.storedName)).catch(() => {});
    }
  } catch {
    console.error("Failed to delete file from disk");
  }

  return { status: 200 as const, body: { message: "Deleted" } };
}

export async function toggleFavoriteBySlug(slug: string) {
  const file = await db
    .select()
    .from(filesTbl)
    .where(eq(filesTbl.slug, slug))
    .limit(1);
  if (!file.length)
    return { status: 404 as const, body: { message: "File not found" } };
  const updated = await db
    .update(filesTbl)
    .set({ isFavorite: !file[0].isFavorite })
    .where(eq(filesTbl.slug, slug))
    .returning();
  return { status: 200 as const, body: updated[0] };
}
