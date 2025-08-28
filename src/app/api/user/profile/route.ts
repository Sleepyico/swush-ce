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

import { NextResponse } from "next/server";
import { getProfile, patchProfile } from "@/lib/api/user";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

export async function GET() {
  const result = await getProfile();

  const res = NextResponse.json(result.body, { status: result.status });
  return res;
}

export async function PATCH(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = 20;
  const windowMs = 60_000;
  const ipRL = await rateLimit({
    key: `ip:${ip}:profile-update`,
    limit: ipLimit,
    windowMs,
  });
  if (!ipRL.success) {
    const retry = ipRL.retryAfter ?? Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many profile update attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(ipLimit));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));
    return res;
  }
  const result = await patchProfile(req);

  const res = NextResponse.json(result.body, { status: result.status });
  res.headers.set("RateLimit-Limit", String(ipLimit));
  res.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return res;
}
