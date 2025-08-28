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
import { headers } from "next/headers";
import { db } from "@/db/client";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import { statSync, createReadStream } from "fs";
import { compare } from "bcryptjs";
import { getUser } from "@/lib/auth/auth";
import { APP_URL } from "@/lib/constant";
import { UPLOAD_ROOT } from "@/lib/api/files";

function safeJoin(base: string, target: string) {
  const p = path.resolve(path.join(base, target));
  if (!p.startsWith(path.resolve(base))) throw new Error("Traversal");
  return p;
}

function toSafeWebStream(
  nodeStream: ReturnType<typeof createReadStream>,
  signal?: AbortSignal
) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let done = false;

      const onData = (chunk: string | Buffer) => {
        if (done) return;
        try {
          if (typeof chunk === "string") {
            controller.enqueue(new TextEncoder().encode(chunk));
          } else {
            controller.enqueue(new Uint8Array(chunk));
          }
        } catch {
          done = true;
          try {
            nodeStream.destroy();
          } catch {}
        }
      };
      const onEnd = () => {
        if (done) return;
        done = true;
        try {
          controller.close();
        } catch {}
      };
      const onError = (err: unknown) => {
        if (done) return;
        done = true;
        try {
          controller.error(err);
        } catch {}
      };
      const onClose = () => {
        if (done) return;
        done = true;
        try {
          controller.close();
        } catch {}
      };

      nodeStream.on("data", onData);
      nodeStream.once("end", onEnd);
      nodeStream.once("error", onError);
      nodeStream.once("close", onClose);

      const onAbort = () => {
        if (done) return;
        done = true;
        try {
          nodeStream.destroy();
        } catch {}
        try {
          controller.close();
        } catch {}
      };
      signal?.addEventListener("abort", onAbort);

      return () => {
        signal?.removeEventListener("abort", onAbort);
        nodeStream.off("data", onData);
        nodeStream.off("end", onEnd);
        nodeStream.off("error", onError);
        nodeStream.off("close", onClose);
        try {
          nodeStream.destroy();
        } catch {}
      };
    },
  });
}

function buildCommonHeaders({
  contentType,
  size,
  filename,
  etag,
  lastModified,
  isPublic,
  hasPassword,
  includeLength = true,
}: {
  contentType: string;
  size: number;
  filename: string;
  etag: string;
  lastModified: string;
  isPublic: boolean;
  hasPassword: boolean;
  includeLength?: boolean;
}) {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
      filename
    )}`,
    ETag: etag,
    "Last-Modified": lastModified,
    "X-Content-Type-Options": "nosniff",
  };

  if (includeLength) headers["Content-Length"] = String(size);

  if (isPublic && !hasPassword) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "private, no-store";
  }

  return headers;
}

function ensureExt(name: string, mime: string, hintedExt?: string) {
  if (hintedExt && hintedExt.startsWith(".")) {
    const base = name.replace(/\.[A-Za-z0-9]{1,8}$/i, "");
    return `${base}${hintedExt}`;
  }
  const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(name);
  if (hasExt) return name;
  const map: Record<string, string> = {
    "image/gif": ".gif",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
  };
  const ext = map[mime] || "";
  return ext ? `${name}${ext}` : name;
}

function mimeFromExt(ext?: string) {
  switch ((ext || "").toLowerCase()) {
    case "gif":
      return "image/gif";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    default:
      return undefined;
  }
}

async function fetchFileRow(slug: string) {
  const rows = await db
    .select()
    .from(files)
    .where(eq(files.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

async function streamFile(
  f: {
    userId: string;
    storedName: string;
    originalName?: string | null;
    mimeType?: string | null;
  },
  req: NextRequest,
  opts: { isPublic: boolean; hasPassword: boolean; hintedExt?: string }
): Promise<NextResponse> {
  let stats: ReturnType<typeof statSync>;
  const filePath = safeJoin(path.join(UPLOAD_ROOT, f.userId), f.storedName);
  try {
    stats = statSync(filePath);
  } catch {
    return NextResponse.json({ message: "Missing file" }, { status: 404 });
  }

  const size = stats.size;
  const mtime = stats.mtimeMs;
  const etag = makeEtag(size, mtime);
  const lastModified = new Date(stats.mtime).toUTCString();
  let contentType = f.mimeType || "application/octet-stream";
  if (/^application\/octet-stream/i.test(contentType) && opts.hintedExt) {
    const m = mimeFromExt(opts.hintedExt);
    if (m) contentType = m;
  }
  const filename = ensureExt(
    (f.originalName || f.storedName || "file").toString(),
    contentType,
    opts.hintedExt
      ? opts.hintedExt.startsWith(".")
        ? opts.hintedExt
        : `.${opts.hintedExt}`
      : undefined
  );

  const h = await headers();
  const ifNoneMatch = h.get("if-none-match");
  const ifModifiedSince = h.get("if-modified-since");
  if (
    ifNoneMatch === etag ||
    (ifModifiedSince && Date.parse(ifModifiedSince) >= stats.mtime.getTime())
  ) {
    const hdrs = buildCommonHeaders({
      contentType,
      size,
      filename,
      etag,
      lastModified,
      isPublic: opts.isPublic,
      hasPassword: opts.hasPassword,
      includeLength: false,
    });
    return new NextResponse(null, { status: 304, headers: hdrs });
  }

  const baseHeaders = buildCommonHeaders({
    contentType,
    size,
    filename,
    etag,
    lastModified,
    isPublic: opts.isPublic,
    hasPassword: opts.hasPassword,
  });

  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (!match) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : size - 1;
    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start > end ||
      end >= size
    ) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
    const chunkSize = end - start + 1;
    const rs = createReadStream(filePath, { start, end });
    return new NextResponse(toSafeWebStream(rs, req.signal), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(chunkSize),
      },
    });
  }

  const rs = createReadStream(filePath);
  return new NextResponse(toSafeWebStream(rs, req.signal), {
    status: 200,
    headers: baseHeaders,
  });
}

function makeEtag(size: number, mtimeMs: number) {
  return `W/"${size}-${Math.trunc(mtimeMs)}"`;
}

type Params = Promise<{ slug: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const user = await getUser();
  const resolved = await params;
  const slug = (resolved?.slug ?? resolved?.slug) as string;

  let rawSlug = slug;
  let hintedExt: string | undefined;
  const dot = slug.lastIndexOf(".");
  if (dot > 0 && slug.length - dot <= 6) {
    hintedExt = slug.slice(dot + 1);
    rawSlug = slug.slice(0, dot);
  }

  const f = await fetchFileRow(rawSlug);
  if (!f) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const suppliedPassword = url.searchParams.get("p") || undefined;

  const hasPassword = Boolean(f.password && f.password.length > 0);
  const isPublic = Boolean(f.isPublic);

  if (user?.id === f.userId) {
    return streamFile(f, req, { isPublic, hasPassword, hintedExt });
  }

  if (hasPassword) {
    const ok =
      suppliedPassword && (await compare(suppliedPassword, f.password!));

    if (!ok) {
      return NextResponse.redirect(
        `${APP_URL || ""}/v/${encodeURIComponent(f.slug)}`
      );
    }
    return streamFile(f, req, { isPublic, hasPassword, hintedExt });
  }

  if (!isPublic) {
    return NextResponse.redirect(
      `${APP_URL || ""}/v/${encodeURIComponent(f.slug)}`
    );
  }

  return streamFile(f, req, { isPublic, hasPassword, hintedExt });
}

export async function HEAD(req: NextRequest, ctx: { params: Params }) {
  const resp = await GET(req, ctx);

  return new NextResponse(null, { status: resp.status, headers: resp.headers });
}
