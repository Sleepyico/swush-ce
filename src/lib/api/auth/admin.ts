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
import { users, files, shortLinks, inviteTokens } from "@/db/schema";
import { sql, eq, or, and } from "drizzle-orm";
import { sendBanLiftedNotification, sendBanNotification } from "@/lib/email";
import { z } from "zod";
import { getServerSettings, updateServerSettings } from "@/lib/settings";
import { hashPassword } from "../helpers";

const LimitsSchema = z.object({
  maxStorageMb: z.number().int().min(0).nullable().optional(),
  maxUploadMb: z.number().int().min(0).nullable().optional(),
  filesLimit: z.number().int().min(0).nullable().optional(),
  shortLinksLimit: z.number().int().min(0).nullable().optional(),
  role: z.enum(["owner", "admin", "user"]).optional(),
  lock: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

function normalizeNumeric(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    return v === 0 ? null : v;
  }
  return undefined;
}

export async function adminGetUsersList() {
  const fileAgg = await db
    .select({
      userId: files.userId,
      filesCount: sql<number>`count(*)`,
      storageBytes: sql<number>`coalesce(sum(${files.size}), 0)`,
    })
    .from(files)
    .groupBy(files.userId);

  const fileMap = new Map(
    fileAgg.map((r) => [
      r.userId,
      { files: Number(r.filesCount), storageBytes: Number(r.storageBytes) },
    ])
  );

  const linkAgg = await db
    .select({
      userId: shortLinks.userId,
      linksCount: sql<number>`count(*)`,
      clicks: sql<number>`coalesce(sum(${shortLinks.clickCount}), 0)`,
    })
    .from(shortLinks)
    .groupBy(shortLinks.userId);

  const linkMap = new Map(
    linkAgg.map((r) => [
      r.userId,
      { links: Number(r.linksCount), clicks: Number(r.clicks) },
    ])
  );

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isLocked: users.isLocked,
      lockReason: users.lockReason,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      maxStorageMb: users.maxStorageMb,
      maxUploadMb: users.maxUploadMb,
      filesLimit: users.filesLimit,
      shortLinksLimit: users.shortLinksLimit,
      twoFactor: users.isTwoFactorEnabled,
    })
    .from(users);

  const zeroToNull = (n: number | null | undefined) =>
    n === 0 ? null : n ?? null;

  return rows.map((u) => {
    const f = fileMap.get(u.id) ?? { files: 0, storageBytes: 0 };
    const l = linkMap.get(u.id) ?? { links: 0, clicks: 0 };
    return {
      ...u,
      isLocked: !!u.isLocked,
      lockReason: u.lockReason ?? null,
      createdAt:
        u.createdAt instanceof Date
          ? u.createdAt.toISOString()
          : String(u.createdAt),
      lastLoginAt: u.lastLoginAt
        ? u.lastLoginAt instanceof Date
          ? u.lastLoginAt.toISOString()
          : String(u.lastLoginAt)
        : null,
      maxStorageMb: zeroToNull(u.maxStorageMb),
      maxUploadMb: zeroToNull(u.maxUploadMb),
      filesLimit: zeroToNull(u.filesLimit),
      shortLinksLimit: zeroToNull(u.shortLinksLimit),
      usage: {
        files: f.files,
        storageBytes: f.storageBytes,
        links: l.links,
        clicks: l.clicks,
      },
      twoFactor: !!u.twoFactor,
    };
  });
}

export async function adminGetUser(id: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isLocked: users.isLocked,
      lockReason: users.lockReason,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      maxStorageMb: users.maxStorageMb,
      maxUploadMb: users.maxUploadMb,
      filesLimit: users.filesLimit,
      shortLinksLimit: users.shortLinksLimit,
      twoFactor: users.isTwoFactorEnabled,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) return null;

  const zeroToNull = (n: number | null | undefined) =>
    n === 0 ? null : n ?? null;
  return {
    ...row,
    createdAt: row.createdAt
      ? new Date(row.createdAt).toISOString()
      : new Date(0).toISOString(),
    lastLoginAt: row.lastLoginAt
      ? new Date(row.lastLoginAt).toISOString()
      : null,
    maxStorageMb: zeroToNull(row.maxStorageMb),
    maxUploadMb: zeroToNull(row.maxUploadMb),
    filesLimit: zeroToNull(row.filesLimit),
    shortLinksLimit: zeroToNull(row.shortLinksLimit),
    twoFactor: !!row.twoFactor,
  };
}

export async function adminUpdateUser(
  id: string,
  data: Record<string, unknown>,
  acting: { id: string; role: "owner" | "admin" | "user" }
) {
  if (acting.role === "owner" && acting.id === id) {
    return { ok: false as const, error: "Owners cannot modify themselves." };
  }

  if (data && data.disable2FA === true) {
    if (acting.role !== "owner" && acting.role !== "admin") {
      return { ok: false as const, error: "Forbidden" };
    }

    if (acting.id === id && acting.role !== "owner") {
      return { ok: false as const, error: "Cannot disable your own 2FA here" };
    }

    try {
      await db
        .update(users)
        .set({
          isTwoFactorEnabled: false,
          totpSecret: null,
        })
        .where(eq(users.id, id));
    } catch {}

    return { ok: true as const };
  }

  const originalRoleChange = data?.role;

  const coerce = (v: unknown) => {
    if (v === "" || v === undefined) return null;
    if (v === null) return null;
    if (typeof v === "string") {
      const n = Number(v.trim());
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    }
    if (typeof v === "number") return v;
    return null;
  };

  const prepared = {
    maxStorageMb: coerce(data.maxStorageMb),
    maxUploadMb: coerce(data.maxUploadMb),
    filesLimit: coerce(data.filesLimit),
    shortLinksLimit: coerce(data.shortLinksLimit),
    role: data.role,
    lock: data.lock,
    reason: data.reason,
  };

  const parsed = LimitsSchema.safeParse(prepared);
  if (!parsed.success) return { ok: false, error: parsed.error.flatten() };

  if (originalRoleChange !== undefined && acting.role !== "owner") {
    return { ok: false as const, error: "Only owners can change roles." };
  }

  const p = parsed.data;
  const update: Record<string, unknown> = {};

  for (const key of Object.keys(p) as (keyof typeof p)[]) {
    const val = p[key];
    if (val === undefined) continue;

    if (
      key === "maxStorageMb" ||
      key === "maxUploadMb" ||
      key === "filesLimit" ||
      key === "shortLinksLimit"
    ) {
      update[key] = normalizeNumeric(val);
    } else if (key === "role") {
      update.role = p.role;
    } else if (key === "lock") {
      update.isLocked = !!p.lock;
    } else if (key === "reason") {
      update.lockReason =
        typeof p.reason === "string" ? p.reason.trim() || null : null;
    }
  }

  if (Object.keys(update).length === 0)
    return { ok: false, error: "No changes" };

  const [row] = await db
    .update(users)
    .set(update)
    .where(eq(users.id, id))
    .returning();

  try {
    const targetEmail = row.email;
    if (p.lock === true) {
      await sendBanNotification(
        targetEmail,
        typeof update.lockReason === "string"
          ? (update.lockReason as string).trim()
          : ""
      );
    } else if (p.lock === false) {
      await sendBanLiftedNotification(targetEmail);
    }
  } catch (err) {
    console.error("Failed to send lock/unlock email:", err);
  }

  return { ok: true, user: row };
}

export async function adminDeleteUser(
  targetId: string,
  me: { id: string; role: string }
) {
  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!target) return { ok: false, error: "User not found" };
  if (targetId === me.id)
    return { ok: false, error: "You cannot delete your own account." };
  if (target.role === "owner" && me.role !== "owner") {
    return { ok: false, error: "Only owners can delete owners." };
  }

  await db.delete(users).where(eq(users.id, targetId));
  return { ok: true };
}

const StringArray = z
  .array(z.string())
  .transform((arr) => arr.map((s) => s.trim()).filter(Boolean));

const SettingsSchema = z.object({
  maxUploadMb: z.number().int().min(1).max(102400),
  maxFilesPerUpload: z.number().int().min(1).max(1000),
  allowPublicRegistration: z.boolean(),
  passwordPolicyMinLength: z.number().int().min(6).max(128),

  userMaxStorageMb: z
    .number()
    .int()
    .min(0)
    .max(1024 * 1024 * 32),
  adminMaxStorageMb: z
    .number()
    .int()
    .min(0)
    .max(1024 * 1024 * 32),

  userDailyQuotaMb: z
    .number()
    .int()
    .min(0)
    .max(1024 * 1024),
  adminDailyQuotaMb: z
    .number()
    .int()
    .min(0)
    .max(1024 * 1024),

  filesLimitUser: z.number().int().min(0).optional(),
  filesLimitAdmin: z.number().int().min(0).optional(),
  shortLinksLimitUser: z.number().int().min(0).optional(),
  shortLinksLimitAdmin: z.number().int().min(0).optional(),

  allowedMimePrefixes: z.union([StringArray, z.null()]).optional(),
  disallowedExtensions: z.union([StringArray, z.null()]).optional(),
  preservedUsernames: z.union([StringArray, z.null()]).optional(),
});

export async function adminGetSettings() {
  return getServerSettings();
}

export async function adminPutSettings(data: unknown) {
  const parsed = SettingsSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.format() };

  const normalize = <T extends string[] | null | undefined>(v: T) =>
    v && Array.isArray(v) && v.length === 0 ? null : v ?? null;

  const updated = await updateServerSettings({
    ...parsed.data,
    allowedMimePrefixes: normalize(parsed.data.allowedMimePrefixes),
    disallowedExtensions: normalize(parsed.data.disallowedExtensions),
    preservedUsernames: normalize(parsed.data.preservedUsernames),
  });

  return { ok: true, settings: updated };
}

const CreateUserSchema = z.object({
  email: z.email(),
  username: z
    .string()
    .min(3)
    .max(32)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(6),
  role: z.enum(["owner", "admin", "user"]).optional().default("user"),
});

export async function adminCreateUser(
  acting: { id: string; role: "owner" | "admin" | "user" },
  body: unknown
) {
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }

  const payload = parsed.data;
  const emailLower = payload.email.trim().toLowerCase();
  const usernameLower = payload.username;

  const settings = await getServerSettings();
  const minLen = settings.passwordPolicyMinLength ?? 8;
  if ((payload.password?.length ?? 0) < minLen) {
    return {
      ok: false as const,
      error: {
        formErrors: [],
        fieldErrors: {
          password: [`Password must be at least ${minLen} characters`],
        },
      },
    };
  }

  if (payload.role !== "user" && acting.role !== "owner") {
    return {
      ok: false as const,
      error: "Only owners can create admins or owners.",
    };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, emailLower), eq(users.username, usernameLower)))
    .limit(1);
  if (existing.length > 0) {
    return { ok: false as const, error: "Email or username already exists" };
  }

  const hashedPassword = await hashPassword(payload.password);

  const [row] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: emailLower,
      username: usernameLower,
      hashedPassword,
      role: payload.role ?? "user",
      isLocked: false,
    })
    .returning({
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isLocked: users.isLocked,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      maxStorageMb: users.maxStorageMb,
      maxUploadMb: users.maxUploadMb,
      filesLimit: users.filesLimit,
      shortLinksLimit: users.shortLinksLimit,
    });

  return { ok: true as const, user: row };
}

const CreateInviteSchema = z.object({
  durationHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 365),
  maxUses: z.number().int().min(1).nullable().optional(),
  note: z.string().max(200).optional().nullable(),
});

export async function adminCreateInvite(
  acting: { id: string; role: "owner" | "admin" | "user" },
  body: unknown
) {
  if (acting.role !== "owner" && acting.role !== "admin") {
    return { ok: false as const, error: "Forbidden" };
  }
  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.flatten() };

  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  const token = Buffer.from(buf).toString("base64url");

  const expires = new Date(Date.now() + parsed.data.durationHours * 3600_000);

  const [row] = await db
    .insert(inviteTokens)
    .values({
      token,
      note: parsed.data.note ?? null,
      expiresAt: expires,
      maxUses: parsed.data.maxUses ?? null,
      createdBy: acting.id,
    })
    .returning({
      id: inviteTokens.id,
      token: inviteTokens.token,
      note: inviteTokens.note,
      expiresAt: inviteTokens.expiresAt,
      maxUses: inviteTokens.maxUses,
      usesCount: inviteTokens.usesCount,
      isDisabled: inviteTokens.isDisabled,
      createdAt: inviteTokens.createdAt,
    });

  return { ok: true as const, invite: row };
}

export async function adminListInvites(acting: {
  id: string;
  role: "owner" | "admin" | "user";
}) {
  if (acting.role !== "owner" && acting.role !== "admin") {
    return { ok: false as const, error: "Forbidden" };
  }
  const rows = await db
    .select({
      id: inviteTokens.id,
      token: inviteTokens.token,
      note: inviteTokens.note,
      expiresAt: inviteTokens.expiresAt,
      maxUses: inviteTokens.maxUses,
      usesCount: inviteTokens.usesCount,
      isDisabled: inviteTokens.isDisabled,
      createdAt: inviteTokens.createdAt,
    })
    .from(inviteTokens)
    .orderBy(sql`${inviteTokens.createdAt} DESC`);
  return { ok: true as const, invites: rows };
}

export async function adminDeleteInvite(
  acting: { id: string; role: "owner" | "admin" | "user" },
  id: number
) {
  if (acting.role !== "owner" && acting.role !== "admin") {
    return { ok: false as const, error: "Forbidden" };
  }
  await db.delete(inviteTokens).where(eq(inviteTokens.id, id));
  return { ok: true as const };
}

const ClearOptionsSchema = z.object({
  filesAll: z.boolean().optional(),
  filesExceptFavorites: z.boolean().optional(),
  links: z.boolean().optional(),
});

export async function adminClearUserData(
  acting: { id: string; role: "owner" | "admin" | "user" },
  targetUserId: string,
  body: unknown
) {
  if (acting.role !== "owner" && acting.role !== "admin") {
    return { ok: false as const, error: "Forbidden" };
  }
  const parsed = ClearOptionsSchema.safeParse(body);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.flatten() };
  const opts = parsed.data;

  if (!Object.values(opts).some(Boolean)) {
    return { ok: false as const, error: "No options selected" };
  }

  if (opts.filesAll || opts.filesExceptFavorites) {
    try {
      if (opts.filesExceptFavorites) {
        await db
          .delete(files)
          .where(
            and(eq(files.userId, targetUserId), eq(files.isFavorite, false))
          );
      } else {
        await db.delete(files).where(eq(files.userId, targetUserId));
      }
    } catch (e) {
      console.error("clear files failed", e);
      return { ok: false as const, error: "Failed to clear files" };
    }
  }

  if (opts.links) {
    try {
      await db.delete(shortLinks).where(eq(shortLinks.userId, targetUserId));
    } catch (e) {
      console.error("clear links failed", e);
      return { ok: false as const, error: "Failed to clear links" };
    }
  }

  return { ok: true as const };
}
