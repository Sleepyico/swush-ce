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
import { deleteFile, getFile, patchFile } from "@/lib/api/files";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const result = await getFile(req, slug);

  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getClientIp(req);
  const ipLimit = 20;
  const slugLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const slugRL = await rateLimit({
    key: `file:${slug}`,
    limit: slugLimit,
    windowMs,
  });

  if (!ipRL.success || !slugRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, slugRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many update attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, slugLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const result = await patchFile(req, slug);

  const okRes = NextResponse.json(result.body, { status: result.status });
  okRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, slugLimit)));
  okRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return okRes;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getClientIp(req);
  const ipLimit = 20;
  const slugLimit = 10;
  const windowMs = 60_000;

  const ipRL = await rateLimit({ key: `ip:${ip}`, limit: ipLimit, windowMs });
  const slugRL = await rateLimit({
    key: `file:${slug}`,
    limit: slugLimit,
    windowMs,
  });

  if (!ipRL.success || !slugRL.success) {
    const retry =
      Math.max(ipRL.retryAfter ?? 0, slugRL.retryAfter ?? 0) ||
      Math.ceil(windowMs / 1000);
    const res = NextResponse.json(
      { message: `Too many delete attempts. Try again in ${retry}s` },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(Math.min(ipLimit, slugLimit)));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("RateLimit-Reset", String(retry));
    res.headers.set("Retry-After", String(retry));

    return res;
  }

  const result = await deleteFile(req, slug);

  const okRes = NextResponse.json(result.body, { status: result.status });
  okRes.headers.set("RateLimit-Limit", String(Math.min(ipLimit, slugLimit)));
  okRes.headers.set("RateLimit-Reset", String(Math.ceil(windowMs / 1000)));
  return okRes;
}
