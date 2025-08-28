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
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { lucia } from "@/lib/auth/lucia";

export async function generate2FASetup(userId: string, label: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(
    label,
    process.env.APP_NAME ?? "Swush",
    secret
  );
  const qr = await qrcode.toDataURL(otpauth);

  await db
    .update(users)
    .set({ totpSecret: secret })
    .where(eq(users.id, userId));

  return { secret, qr };
}

export async function verifyAndEnable2FA(userId: string, token: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!dbUser || !dbUser.totpSecret) throw new Error("No 2FA secret found");

  const isValid = authenticator.check(token, dbUser.totpSecret);
  if (!isValid) throw new Error("Invalid code");

  await db
    .update(users)
    .set({ isTwoFactorEnabled: true })
    .where(eq(users.id, userId));
  return { success: true } as const;
}

export async function remove2FA(userId: string) {
  await db
    .update(users)
    .set({ totpSecret: null, isTwoFactorEnabled: false })
    .where(eq(users.id, userId));
  return { success: true } as const;
}

export async function get2FAStatus(userId: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return { isTwoFactorEnabled: Boolean(dbUser?.isTwoFactorEnabled) } as const;
}

export async function confirm2FAAndCreateSession(
  pendingUserId: string,
  token: string
) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, pendingUserId),
  });
  if (!dbUser || !dbUser.totpSecret) throw new Error("2FA not setup");

  const isValid = authenticator.check(token, dbUser.totpSecret);
  if (!isValid) throw new Error("Invalid code");

  const session = await lucia.createSession(dbUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  return { sessionCookie } as const;
}
