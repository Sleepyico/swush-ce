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

import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/auth";
import { Logo } from "@/components/Common/Logo";
import { IconBrandChrome } from "@tabler/icons-react";
import { IconAlertCircle } from "@tabler/icons-react";
import pkg from "../../package.json";
import Link from "next/link";

export default async function Home() {
  const user = await getUser();

  const currentVersion = pkg.version || "dev";

  async function getLatestVersion(): Promise<string | null> {
    try {
      const res = await fetch(
        "https://api.github.com/repos/sleepyico/swush-ce/releases/latest",
        { next: { revalidate: 60 * 60 } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const tag = (data?.tag_name as string) || "";
      return tag?.startsWith("v") ? tag.slice(1) : tag || null;
    } catch {
      return null;
    }
  }

  function parseSemver(v: string): [number, number, number] | null {
    const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }

  function isNewer(latest: string, current: string) {
    const a = parseSemver(latest);
    const b = parseSemver(current);
    if (!a || !b) return false;
    for (let i = 0; i < 3; i++) {
      if (a[i] > b[i]) return true;
      if (a[i] < b[i]) return false;
    }
    return false;
  }

  const latestVersion = await getLatestVersion();
  const updateAvailable =
    latestVersion &&
    parseSemver(currentVersion) &&
    isNewer(latestVersion, currentVersion);

  return (
    <main className="max-h-[100vh] bg-background text-foreground flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-2xl text-center space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-1 text-5xl">
          <span>Welcome to</span>
          <Logo size={64} textClassName="text-5xl" />
        </div>
        <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
          Secure. Private. Share files with confidence. <br />
          Self-hosted simplicity meets powerful privacy.
        </p>
        <div className="flex gap-4 justify-center flex-col sm:flex-row">
          {user ? (
            <Button href="/vault">Go to Dashboard</Button>
          ) : (
            <Button href="/login">Login</Button>
          )}
          <Button asChild variant="outline" className="gap-1">
            <a
              href="https://chromewebstore.google.com/detail/jgipkeccibhgdfhoknfggljdmdodkjop?utm_source=item-share-cb"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Install Swush Companion for Chrome"
            >
              <IconBrandChrome size={18} /> Chrome Extension
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Need help?{" "}
          <a
            href={`mailto:${process.env.SUPPORT_EMAIL}`}
            className="underline hover:text-primary"
          >
            Contact support
          </a>
        </p>
      </div>

      <section className="mt-20 max-w-5xl w-full px-4">
        <h2 className="text-3xl font-semibold text-center mb-10">Why Swush?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-lg border p-6 bg-card">
            <h3 className="font-medium mb-2">⚡ Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">
              Experience fast uploads.
            </p>
          </div>
          <div className="rounded-lg border p-6 bg-card">
            <h3 className="font-medium mb-2">🛡️ Advanced Security</h3>
            <p className="text-sm text-muted-foreground">
              Built-in 2FA and secure session management keep accounts safe.
            </p>
          </div>
          <div className="rounded-lg border p-6 bg-card">
            <h3 className="font-medium mb-2">🖥️ Self-Hosted</h3>
            <p className="text-sm text-muted-foreground">
              Own your data with a 100% self-hosted and open-source platform.
            </p>
          </div>
          <div className="rounded-lg border p-6 bg-card">
            <h3 className="font-medium mb-2">🎯 Smart Access</h3>
            <p className="text-sm text-muted-foreground">
              Role-based access control and expiring links give you precision.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 text-xs text-muted-foreground flex items-center justify-center gap-2">
        <span>
          Version <span className="font-mono">v{currentVersion}</span>
        </span>
        {updateAvailable && latestVersion ? (
          <Link
            href="https://github.com/sleepyico/swush-ce/releases/latest"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 rounded border px-2 bg-destructive text-primary-foreground py-0.5 hover:bg-accent"
          >
            <IconAlertCircle size={14} /> Update available (v{latestVersion})
          </Link>
        ) : null}
      </div>
    </main>
  );
}
