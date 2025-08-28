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
import { requestPasswordReset } from "@/lib/api/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.clone().json();
  const email = (body?.email ?? "unknown").toLowerCase();

  const ipLimit = 10;
  const userLimit = 5;
  const windowMs = 60_000;

  const ipResult = await rateLimit({
    key: `ip:${ip}`,
    limit: ipLimit,
    windowMs,
  });
  const userResult = await rateLimit({
    key: `pwreset:${email}`,
    limit: userLimit,
    windowMs,
  });

  if (!ipResult.success || !userResult.success) {
    const retryAfter =
      Math.max(ipResult.retryAfter ?? 0, userResult.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      {
        message: `Too many password reset attempts. Try again in ${retryAfter}s`,
      },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retryAfter));
    res.headers.set("Retry-After", String(retryAfter));

    return res;
  }

  const result = await requestPasswordReset(req);
  const res = NextResponse.json(result.body, { status: result.status });
  res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, userLimit)));
  res.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return res;
}
