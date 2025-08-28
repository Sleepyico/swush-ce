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
import { eq, sql } from "drizzle-orm";
import bcrypt, { compare, hash } from "bcryptjs";
import { createHash } from "crypto";

import { db } from "@/db/client";
import { inviteTokens, sessionTable, users } from "@/db/schema";
import { lucia } from "@/lib/auth/lucia";
import { getUser, getUserFromToken } from "@/lib/auth/auth";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
} from "@/lib/email";
import { APP_URL } from "@/lib/constant";
import { getServerSettings, isUsernamePreserved } from "@/lib/settings";
import { getClientIp } from "@/lib/security/ip";

function deviceFingerprint(ip: string, ua: string) {
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex");
}

export async function registerUser(req: NextRequest) {
  const id = crypto.randomUUID();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return { status: 400, body: { message: "Invalid body" } } as const;
  }
  const { email, password, username } = body as {
    email: string;
    password: string;
    username: string;
  };
  if (!email || !password || !username) {
    return { status: 400, body: { message: "Missing fields" } } as const;
  }

  const url = new URL(req.url);
  const inviteToken = url.searchParams.get("invite");

  const s = await getServerSettings();

  let inviteRow: { id: number } | null = null;

  if (!s.allowPublicRegistration) {
    if (!inviteToken) {
      return {
        status: 403,
        body: { message: "Registration is closed" },
      } as const;
    }
    const [row] = await db
      .select({
        id: inviteTokens.id,
        expiresAt: inviteTokens.expiresAt,
        maxUses: inviteTokens.maxUses,
        usesCount: inviteTokens.usesCount,
        isDisabled: inviteTokens.isDisabled,
      })
      .from(inviteTokens)
      .where(sql`${inviteTokens.token} = ${inviteToken}`)
      .limit(1);

    const now = new Date();
    const valid =
      row &&
      !row.isDisabled &&
      row.expiresAt > now &&
      (row.maxUses == null || row.usesCount < row.maxUses);

    if (!valid) {
      return {
        status: 403,
        body: { message: "Invite is invalid or expired" },
      } as const;
    }
    inviteRow = { id: row.id };
  }

  const minLen = Math.max(6, s.passwordPolicyMinLength ?? 8);
  if (password.length < minLen) {
    return {
      status: 400,
      body: { message: `Password must be at least ${minLen} characters long.` },
    } as const;
  }

  const emailLower = email.trim().toLowerCase();
  const usernameLower = username.trim().toLowerCase();

  if (isUsernamePreserved(usernameLower, s)) {
    return { status: 400, body: { message: "Username is reserved" } } as const;
  }

  const existingEmail = await db.query.users.findFirst({
    where: eq(users.email, emailLower),
  });
  if (existingEmail)
    return { status: 400, body: { message: "Email taken" } } as const;

  const existingUsername = await db.query.users.findFirst({
    where: eq(users.username, usernameLower),
  });
  if (existingUsername)
    return { status: 400, body: { message: "Username taken" } } as const;

  const userCount = await db.select().from(users);
  const hashed = await hash(password, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      id,
      email: emailLower,
      username: usernameLower,
      hashedPassword: hashed,
      role: userCount.length === 0 ? "owner" : "user",
    })
    .returning();

  if (inviteRow) {
    await db
      .update(inviteTokens)
      .set({ usesCount: sql`${inviteTokens.usesCount} + 1` })
      .where(sql`${inviteTokens.id} = ${inviteRow.id}`);
  }

  const session = await lucia.createSession(newUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  (await cookies()).set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  try {
    await sendWelcomeEmail(newUser.email, newUser.username!);
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }

  return { status: 200, body: { success: true } } as const;
}

export async function loginUser(req: NextRequest) {
  const body = await req.json();

  if (!body || typeof body !== "object") {
    return { status: 400, body: { message: "Invalid request" } } as const;
  }

  const { emailOrUsername, password } = body as {
    emailOrUsername: string;
    password: string;
  };

  const ident = (emailOrUsername || "").trim().toLowerCase();

  const user = await db.query.users.findFirst({
    where: (u, { or, eq }) => or(eq(u.email, ident), eq(u.username, ident)),
  });

  if (!user) {
    return { status: 401, body: { message: "Invalid credentials" } } as const;
  }

  const valid = await compare(password, user.hashedPassword);

  if (!valid) {
    return { status: 401, body: { message: "Invalid credentials" } } as const;
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  if (user.isLocked) {
    const support = process.env.SUPPORT_EMAIL || "N/A";
    const msg = user.lockReason
      ? `Account locked due to ${user.lockReason}. Please contact ${support}.`
      : `Account locked. Please contact ${support}.`;
    return { status: 403, body: { message: msg } } as const;
  }

  if (user.isTwoFactorEnabled) {
    const twoFACookie = {
      name: "swush_2fa_pending",
      value: user.id,
      attributes: {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 60 * 5,
      },
    };
    (await cookies()).set(
      twoFACookie.name,
      twoFACookie.value,
      twoFACookie.attributes
    );
    return { status: 200, body: { requires2FA: true } } as const;
  }

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  (await cookies()).set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  try {
    const ua = req.headers.get("user-agent") || "unknown";
    const ipForCookie = getClientIp(req);

    const fp = deviceFingerprint(ipForCookie, ua);
    const cookieStore = await cookies();
    const known = cookieStore.get("swush_known_device")?.value;
    if (!known || known !== fp) {
      await sendLoginAlertEmail(user.email, {
        ip: ipForCookie,
        userAgent: ua,
        whenISO: new Date().toISOString(),
      });
      cookieStore.set("swush_known_device", fp, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    await db
      .update(sessionTable)
      .set({ ipAddress: ipForCookie, userAgent: ua })
      .where(eq(sessionTable.id, session.id));
  } catch (err) {
    console.error("Login alert email failed:", err);
  }

  return { status: 200, body: { success: true } } as const;
}

export async function requestPasswordReset(req: NextRequest) {
  const parsed = (await req.json().catch(() => ({}))) as { email?: string };
  const email = parsed.email?.trim().toLowerCase();
  if (!email)
    return { status: 400, body: { message: "Email is required" } } as const;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return {
      status: 200,
      body: { message: "If that email exists, a reset link will be sent" },
    } as const;
  }

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 30);

  const origin = APP_URL || new URL(req.url).origin;
  const resetLink = `${origin}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  await db
    .update(users)
    .set({ resetToken: token, resetTokenExpiry: expires })
    .where(eq(users.id, user.id));

  await sendPasswordResetEmail(user.email, resetLink);

  return { status: 200, body: { message: "Reset link sent" } } as const;
}

export async function resetPassword(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return { status: 400, body: { message: "Invalid input" } } as const;
  }
  const { token, password } = json as { token?: string; password?: string };
  if (!token || !password) {
    return { status: 400, body: { message: "Invalid input" } } as const;
  }

  const s = await getServerSettings();
  const minLen = Math.max(6, s.passwordPolicyMinLength ?? 8);
  if (password.length < minLen) {
    return {
      status: 400,
      body: { message: `Password must be at least ${minLen} characters long.` },
    } as const;
  }

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.resetToken, token))
    .limit(1);

  if (
    !u ||
    !u.resetTokenExpiry ||
    !(u.resetTokenExpiry instanceof Date) ||
    u.resetTokenExpiry <= new Date()
  ) {
    return {
      status: 400,
      body: { message: "Invalid or expired token" },
    } as const;
  }

  const hash = await bcrypt.hash(password, 12);
  await db
    .update(users)
    .set({ hashedPassword: hash, resetToken: null, resetTokenExpiry: null })
    .where(eq(users.id, u.id));

  try {
    await lucia.invalidateUserSessions(u.id);
  } catch (err) {
    console.error("Failed to revoke sessions after password reset:", err);
  }

  try {
    await sendPasswordChangedEmail(u.email);
  } catch (err) {
    console.error("Failed to send password changed email:", err);
  }

  return { status: 200, body: { ok: true } } as const;
}

export async function logoutUser() {
  const store = cookies();
  const name = lucia.sessionCookieName;
  const sessionId = (await store).get(name)?.value;

  if (sessionId) {
    await lucia.invalidateSession(sessionId);
    (await store).set(name, "", { path: "/", expires: new Date(0) });
  }
  return { status: 200, body: null as null } as const;
}

export async function getCurrentUser() {
  const user = await getUser();
  if (!user) {
    return { status: 401, body: { user: null } } as const;
  }
  return { status: 200, body: { user } } as const;
}

export async function getCurrentUserFromToken(req: NextRequest) {
  const user = (await getUser()) || (await getUserFromToken(req));
  if (!user) return { status: 401, body: { user: null } } as const;
  return { status: 200, body: { user } } as const;
}
