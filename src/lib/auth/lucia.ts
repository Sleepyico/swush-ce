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

import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { sessionTable, users as userTable } from "@/db/schema";
import { db } from "@/db/client";

const adapter = new DrizzlePostgreSQLAdapter(db, sessionTable, userTable);
const isHttps =
  process.env.NODE_ENV === "production" &&
  process.env.APP_URL?.startsWith("https://");

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "auth_session",
    expires: false,
    attributes: {
      secure: isHttps,
      sameSite: "lax",
      path: "/",
    },
  },
  getUserAttributes: (data) => ({
    email: data.email,
    username: data.username,
    isAdmin: data.isAdmin,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      username: string;
      isAdmin: boolean;
    };
  }
}
