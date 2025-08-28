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

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { confirm2FAAndCreateSession } from "@/lib/api/auth/twofa";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const pendingId = (await cookieStore).get("swush_2fa_pending")?.value;
  if (!pendingId)
    return NextResponse.json(
      { message: "No pending user found" },
      { status: 401 }
    );

  const ip = getClientIp(req);
  const ipLimit = 30;
  const userLimit = 15;
  const windowMs = 60_000;

  const ipResult = await rateLimit({
    key: `ip:${ip}`,
    limit: ipLimit,
    windowMs,
  });
  const userResult = await rateLimit({
    key: `u:${pendingId}`,
    limit: userLimit,
    windowMs,
  });

  if (!ipResult.success || !userResult.success) {
    const retryAfter =
      Math.max(ipResult.retryAfter ?? 0, userResult.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many attempts. Try again in ${retryAfter}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retryAfter));
    res.headers.set("Retry-After", String(retryAfter));

    return res;
  }

  const { token } = await req.json();
  try {
    const { sessionCookie } = await confirm2FAAndCreateSession(
      pendingId,
      token
    );

    (await cookieStore).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    (await cookieStore).delete("swush_2fa_pending");

    const okRes = NextResponse.json({ success: true });
    okRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    okRes.headers.set("RateLimit-Remaining", "1");
    okRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
    return okRes;
  } catch (e) {
    const badRes = NextResponse.json(
      { message: (e as Error)?.message || "Invalid code" },
      { status: 400 }
    );

    badRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    badRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
    return badRes;
  }
}
