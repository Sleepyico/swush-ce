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
import { getUser } from "@/lib/auth/auth";
import { remove2FA } from "@/lib/api/auth/twofa";

export async function POST() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await remove2FA(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove 2FA:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
