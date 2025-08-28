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
import { requireAdmin } from "@/lib/security/roles";
import {
  adminCreateInvite,
  adminCreateUser,
  adminDeleteInvite,
  adminGetUsersList,
  adminListInvites,
} from "@/lib/api/auth/admin";
import { Role } from "@/lib/security/policy";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const result = await adminGetUsersList();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);

  if (body?.type === "invite.list") {
    const r = await adminListInvites({
      id: admin.id,
      role: admin.role as Role,
    });
    return NextResponse.json(
      r.ok ? { ok: true, invites: r.invites } : { ok: false, message: r.error },
      { status: r.ok ? 200 : 403 }
    );
  }

  if (body?.type === "invite.create") {
    const r = await adminCreateInvite(
      { id: admin.id, role: admin.role as Role },
      {
        durationHours: Number(body.durationHours),
        maxUses: body.maxUses == null ? null : Number(body.maxUses),
        note: body.note ?? null,
      }
    );
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, message: "Invalid data", error: r.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, invite: r.invite });
  }

  if (body?.type === "invite.delete") {
    const r = await adminDeleteInvite(
      { id: admin.id, role: admin.role as Role },
      Number(body.id)
    );

    return NextResponse.json(
      r.ok ? { ok: true } : { ok: false, message: r.error },
      { status: r.ok ? 200 : 403 }
    );
  }

  const result = await adminCreateUser(
    { id: admin.id, role: admin.role as "owner" | "admin" | "user" },
    body
  );
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          typeof result.error === "string" ? result.error : "Invalid data",
        error: result.error,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, user: result.user });
}
