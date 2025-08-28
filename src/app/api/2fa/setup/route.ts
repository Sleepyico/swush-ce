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
import { cookies } from "next/headers";
import { lucia } from "@/lib/auth/lucia";
import { generate2FASetup } from "@/lib/api/auth/twofa";

export async function GET() {
  let user;
  try {
    const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value;
    if (!sessionId)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const validated = await lucia.validateSession(sessionId);
    user = validated.user;
    if (!user)
      return NextResponse.json({ message: "Invalid session" }, { status: 401 });

    const label = user.username || user.email;
    const { secret, qr } = await generate2FASetup(user.id, label);

    return NextResponse.json({ secret, qr });
  } catch {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
