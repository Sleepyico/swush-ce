/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { NextResponse } from "next/server";

export type PublicRuntimeConfig = {
  appName: string;
  appUrl: string;
  supportName: string;
  supportEmail: string;
};

export async function GET() {
  const payload: PublicRuntimeConfig = {
    appName: process.env.APP_NAME ?? "Swush",
    appUrl: process.env.APP_URL ?? "",
    supportName: process.env.SUPPORT_NAME ?? "",
    supportEmail: process.env.SUPPORT_EMAIL ?? "",
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Content-Type": "application/json",
    },
  });
}
