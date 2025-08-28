/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   You may not use this file except in compliance with the License.
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

import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  IconBolt,
  IconClock,
  IconBook2,
  IconLock,
  IconShare3,
  IconSearch,
  IconPlayerPlay,
  IconDatabase,
  IconCode,
  IconChefHat,
  IconFile,
  IconBookmark,
  IconBrandX,
  IconBrandGithub,
  IconWorld,
  IconBrandChrome,
} from "@tabler/icons-react";
import { defaultMetadata } from "@/lib/head";
import { Logo } from "@/components/Common/Logo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const metadata: Metadata = {
  ...defaultMetadata,
  title: "About",
  description: "What Swush is, how it works, and the love behind it.",
};

function ProMode() {
  return (
    <Badge className="bg-secondary border-primary text-[8px] text-primary font-bold">
      PRO Only
    </Badge>
  );
}

export default function AboutPage() {
  return (
    <div className="relative">
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <Tabs defaultValue="about" className="w-full">
          <header className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <Logo size={64} textClassName="text-6xl" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
                your creation hub, tuned for speed & flow
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <IconFile size={16} /> Files
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <IconSearch size={16} /> Fast Search
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <IconShare3 size={16} /> Public Links
                </Badge>
              </div>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Snippets, Recipes, and more. Create, search, share (public or
                password‑protected), and glide through focused workflows; all in
                a lightweight, modern stack.
              </p>
            </div>

            <TabsList className="mx-auto w-full max-w-3xl grid grid-cols-3 gap-2 mb-4">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="how-to">How‑to</TabsTrigger>
              <TabsTrigger value="credits">Credits</TabsTrigger>
            </TabsList>
          </header>

          <TabsContent value="about">
            <AboutSection />
          </TabsContent>

          <TabsContent value="how-to">
            <HowToSection />
          </TabsContent>

          <TabsContent value="credits">
            <CreditsSection />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Made with <span className="text-primary">♥</span> by Iconical — 2025
        </footer>
      </section>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconBook2 size={18} /> Capture
            </CardTitle>
            <CardDescription>
              Add your content once — Swush keeps it tidy and instantly
              searchable.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Snippets: title, language, code, description. <ProMode />
              </li>
              <li>
                Recipes: ingredients, steps, images, servings, time. <ProMode />
              </li>
              <li>Funny slugs auto‑generated for pretty URLs.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconSearch size={18} /> Find
            </CardTitle>
            <CardDescription>
              Type to filter — results update as you write.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>Live search across titles, descriptions & body.</li>
              <li>Recipe tags for quick filtering.</li>
              <li>Lightweight API + DB queries with indexes in mind.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-4 text-lg">
              <IconShare3 size={18} /> Share
            </CardTitle>
            <CardDescription>
              Public pages with optional passwords. Just copy the link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>One‑click copy share links.</li>
              <li>Password‑protected viewing when you need privacy.</li>
              <li>Clean, responsive, theme‑aware public pages.</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconPlayerPlay size={18} /> “Start Cooking” Mode <ProMode />
            </CardTitle>
            <CardDescription>
              Local client‑side timers per step with smart defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              Public recipes include a step‑by‑step runner. Each step can parse
              minutes from text (e.g. “Bake 30 minutes”), auto‑arming a timer.
              You can start, pause, reset, mark done, and tweak minutes on the
              fly; no account required.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <FeatureChip
                icon={<IconClock size={14} />}
                label="Auto‑parsed durations"
              />
              <FeatureChip
                icon={<IconBolt size={14} />}
                label="Fallbacks when time is missing"
              />
              <FeatureChip
                icon={<IconPlayerPlay size={14} />}
                label="Per‑step control"
              />
              <FeatureChip
                icon={<IconShare3 size={14} />}
                label="Works on public links"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconLock size={18} /> Privacy by Design
            </CardTitle>
            <CardDescription>
              Share when you want; keep private when you don’t.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              Items default to private. Public pages expose only what’s needed
              and never include secrets. Optional passwords use hashed
              verification on the server side.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <FeatureChip
                icon={<IconLock size={14} />}
                label="Optional passwords"
              />
              <FeatureChip
                icon={<IconDatabase size={14} />}
                label="Lean server queries"
              />
              <FeatureChip
                icon={<IconCode size={14} />}
                label="Type‑safe API"
              />
              <FeatureChip icon={<IconBolt size={14} />} label="No bloat" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StackCard
          title="Next.js & App Router"
          desc="Modern routing, server components where it matters, client where it shines."
        />
        <StackCard
          title="TypeScript + Drizzle"
          desc="Typed queries, clear schema — no `any`, no surprises."
        />
        <StackCard
          title="Tailwind + shadcn/ui"
          desc="Design‑system clarity with fast iteration and theme awareness."
        />
      </section>
    </div>
  );
}

function HowToSection() {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconFile size={18} /> Upload files
            </CardTitle>
            <CardDescription>
              Drag & drop or click “Upload” in your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Go to <span className="font-medium">Vault → Files</span>.
              </li>
              <li>
                Drag files in or click{" "}
                <span className="font-medium">Upload</span>.
              </li>
              <li>
                Optionally set <span className="font-medium">Public</span> and
                add a password.
              </li>
              <li>Copy the share link or open the public page.</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconBookmark size={18} /> Shorten links
            </CardTitle>
            <CardDescription>Turn long URLs into neat slugs.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Open <span className="font-medium">Shortener</span>.
              </li>
              <li>
                Paste your URL (data will be auto-fetched e.g. title, desc.
                etc...).
              </li>
              <li>
                Toggle <span className="font-medium">Public</span> if you want a
                shareable page.
              </li>
              <li>Use the generated short link anywhere.</li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconCode size={18} /> Code Snippets <ProMode />
            </CardTitle>
            <CardDescription>
              Store code with language awareness and pretty URLs.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Go to <span className="font-medium">Snippets</span> and click{" "}
                <span className="font-medium">New</span>.
              </li>
              <li>Set title, language, and paste your code.</li>
              <li>(Optional) Add a description and make it public.</li>
              <li>Share the link or keep it private.</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconChefHat size={18} /> Recipes & “Start Cooking” <ProMode />
            </CardTitle>
            <CardDescription>
              Write ingredients/steps and run them with timers.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li>Create a recipe with ingredients, steps, images.</li>
              <li>Public recipe pages include a per‑step timer runner.</li>
              <li>
                Click <span className="font-medium">Start Cooking</span> to
                auto‑parse durations.
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconWorld size={18} /> Browser Extension
            </CardTitle>
            <CardDescription>
              “Swush Companion” for quick uploads.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Install the extension and open{" "}
                <span className="font-medium">Options</span>.
              </li>
              <li>
                Enter your instance URL and API token from{" "}
                <span className="font-medium">Settings → API</span>.
              </li>
              <li>
                Use hotkeys: Alt+B (bookmark), Alt+N (note), Alt+U (upload).
              </li>
              <li>
                Right‑click context menu to send the current page to Swush.
              </li>
            </ol>
            <div className="pt-2">
              <Button asChild className="gap-1">
                <a
                  href="https://chromewebstore.google.com/detail/jgipkeccibhgdfhoknfggljdmdodkjop?utm_source=item-share-cb"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Install Swush Companion for Chrome"
                >
                  <IconBrandChrome size={18} /> Install on Chrome
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconPlayerPlay size={18} /> Games, Watchlists & Imports{" "}
              <ProMode />
            </CardTitle>
            <CardDescription>
              Track your media and pull playtime where available.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Open <span className="font-medium">Games</span> or{" "}
                <span className="font-medium">Watchlist</span>.
              </li>
              <li>
                Add entries manually or via{" "}
                <span className="font-medium">Import</span>
              </li>
              <li>Fetch playtime where enabled.</li>
              <li>
                Add personal notes, mark favorites, and toggle public/private.
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconSearch size={18} /> Search & Privacy
          </CardTitle>
          <CardDescription>
            Fast filters with sensible defaults; private first.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Instant, debounced client filters + indexed server queries.</li>
            <li>
              Everything is private by default. Public pages expose only
              necessary fields.
            </li>
            <li>
              Password gates use server‑side hashed verification when enabled.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function CreditsSection() {
  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Crafted by Iconical (Laith)</CardTitle>
          <CardDescription>
            Design, code, and a tiny bit of chaos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Swush is built for speed, clarity, and sharing. If you enjoy it,
            stars and feedback mean the world.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="gap-1">
              <a
                href="https://github.com/sleepyico"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Iconical on GitHub"
              >
                <IconBrandGithub size={18} /> github.com/sleepyico
              </a>
            </Button>
            <Button asChild className="gap-1">
              <a
                href="https://x.com/sleepyiconical"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Iconical on X"
              >
                <IconBrandX size={18} /> @sleepyiconical
              </a>
            </Button>
            <Button asChild className="gap-1">
              <a
                href="https://iconical.dev"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Iconical website"
              >
                <IconWorld size={18} /> iconical.dev
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Open‑source stack</CardTitle>
            <CardDescription>
              Big love to the tools making this possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>Next.js (App Router)</li>
              <li>TypeScript</li>
              <li>Drizzle ORM + PostgreSQL</li>
              <li>Tailwind CSS</li>
              <li>shadcn/ui + Radix primitives</li>
              <li>Tabler Icons</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Community & credits</CardTitle>
            <CardDescription>Ideas, feedback, and good vibes.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Thanks to friends and testers for trying every edge case and
              making Swush sharper.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function FeatureChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5",
        "border-primary/20 bg-primary/5 text-purple-100 dark:text-purple-200"
      )}
    >
      <span className="opacity-90">{icon}</span>
      <span className="text-[11px] font-medium tracking-wide">{label}</span>
    </div>
  );
}

function StackCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}
