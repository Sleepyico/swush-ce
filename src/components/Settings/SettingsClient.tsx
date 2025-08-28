/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

"use client";

import { ApiTokens } from "@/components/Settings/ApiTokens";
import PageLayout from "../Common/PageLayout";
import InformationChange from "./InformationChange";
import PasswordChange from "./PasswordChange";
import SessionsSection from "./SessionsSection";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";

export default function SettingsClient() {
  const sections = [
    <InformationChange key="information-change" />,
    <PasswordChange key="password-change" />,
    <ApiTokens key="api-tokens" />,
    <SessionsSection key="sessions" />,
  ];

  return (
    <PageLayout
      title="Account Settings"
      subtitle="Manage your personal details and security preferences."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((section, idx) => (
          <Card
            key={idx}
            className={cn(
              "",
              idx === 2 || idx === 3 ? "md:col-span-2" : "md:col-span-1"
            )}
          >
            <CardContent>{section}</CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
