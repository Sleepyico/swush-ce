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

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/auth";
import { SidebarWrapper } from "@/components/Dashboard/Sidebar";
import { defaultMetadata } from "@/lib/head";
import { Metadata } from "next";

export const metadata: Metadata = {
  ...defaultMetadata,
  title: "Dashboard",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarWrapper>
      <div className="flex-1 flex bg-secondary h-full">
        <div className="flex w-full flex-1 flex-col gap-2 rounded-tl-2xl bg-background p-2 md:p-6">
          <div className="overflow-y-auto flex-1 rounded-lg">
            {children}
          </div>
        </div>
      </div>
    </SidebarWrapper>
  );
}
