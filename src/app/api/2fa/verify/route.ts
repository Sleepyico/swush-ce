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
import { lucia } from "@/lib/auth/lucia";
import { cookies } from "next/headers";
import { verifyAndEnable2FA } from "@/lib/api/auth/twofa";

export async function POST(req: NextRequest) {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value;
  if (!sessionId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { user } = await lucia.validateSession(sessionId);
  if (!user)
    return NextResponse.json({ message: "Invalid session" }, { status: 401 });

  const { token } = await req.json();
  try {
    await verifyAndEnable2FA(user.id, token);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error)?.message || "Invalid code" },
      { status: 400 }
    );
  }
}
