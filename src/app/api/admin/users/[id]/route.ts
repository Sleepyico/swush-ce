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
 *   See the License for the specific language governing permissio
 *   limitations under the License.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/roles";
import { getUser } from "@/lib/auth/auth";
import {
  adminClearUserData,
  adminDeleteUser,
  adminGetUser,
  adminUpdateUser,
} from "@/lib/api/auth/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id)
    return NextResponse.json({ message: "Missing user id" }, { status: 400 });

  const user = await adminGetUser(id);
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getUser();
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  let json: Record<string, unknown>;

  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const updated = await adminUpdateUser(id, json, {
    id: me?.id ?? "",
    role: admin.role,
  });

  if (!updated.ok)
    return NextResponse.json({ message: updated.error }, { status: 400 });

  return NextResponse.json(
    { ok: true, user: updated.user },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  let json: Record<string, unknown> = {};
  try {
    json = await req.json();
  } catch {}

  if (json?.type !== "clear") {
    return NextResponse.json(
      { message: "Unsupported action" },
      { status: 400 }
    );
  }

  const result = await adminClearUserData(
    { id: admin.id, role: admin.role },
    id,
    json?.options ?? {}
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const me = await getUser();
  if (!me) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const result = await adminDeleteUser(id, { id: me.id, role: admin.role });

  if (!result.ok)
    return NextResponse.json({ message: result.error }, { status: 400 });

  return NextResponse.json({ success: true });
}
