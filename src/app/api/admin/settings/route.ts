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
import { adminGetSettings, adminPutSettings } from "@/lib/api/auth/admin";

export async function GET() {
  await requireAdmin();
  const settings = await adminGetSettings();

  return NextResponse.json(settings, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(req: Request) {
  await requireAdmin();
  const json = await req.json();

  const result = await adminPutSettings(json);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Invalid payload", details: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json(result.settings, {
    headers: { "Cache-Control": "no-store" },
  });
}
