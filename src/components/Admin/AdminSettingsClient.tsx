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

"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ServerSettings } from "@/lib/settings";
import { toast } from "sonner";
import Field from "../Shared/CustomField";
import Grid from "../Shared/CustomGrid";
import ToggleRow from "../Shared/CustomToggle";
import Card from "../Shared/CustomCard";
import PageLayout from "../Common/PageLayout";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

const SettingsSchema = z.object({
  maxUploadMb: z.coerce.number().int().min(1).max(102400),
  maxFilesPerUpload: z.coerce.number().int().min(1).max(1000),
  allowPublicRegistration: z.boolean(),
  passwordPolicyMinLength: z.coerce.number().int().min(6).max(128),

  userDailyQuotaMb: z.coerce
    .number()
    .int()
    .min(0)
    .max(1024 * 1024),
  adminDailyQuotaMb: z.coerce
    .number()
    .int()
    .min(0)
    .max(1024 * 1024),

  userMaxStorageMb: z.coerce
    .number()
    .int()
    .min(0)
    .max(1024 * 1024),
  adminMaxStorageMb: z.coerce
    .number()
    .int()
    .min(0)
    .max(1024 * 1024),

  filesLimitUser: z.coerce.number().int().min(1).max(10000).nullable(),
  filesLimitAdmin: z.coerce.number().int().min(1).max(10000).nullable(),
  shortLinksLimitUser: z.coerce.number().int().min(1).max(10000).nullable(),
  shortLinksLimitAdmin: z.coerce.number().int().min(1).max(10000).nullable(),

  allowedMimePrefixes: z.string().optional(),
  disallowedExtensions: z.string().optional(),
  preservedUsernames: z.string().optional(),
});

type FormValues = z.infer<typeof SettingsSchema>;

const strArrParser = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function HelpTip({
  text,
  side = "top",
}: {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Help"
            className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-snug">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AdminSettingsClient({
  initialValues,
}: {
  initialValues: ServerSettings;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(SettingsSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      maxUploadMb: initialValues.maxUploadMb,
      maxFilesPerUpload: initialValues.maxFilesPerUpload,
      allowPublicRegistration: initialValues.allowPublicRegistration,

      userDailyQuotaMb: initialValues.userDailyQuotaMb,
      adminDailyQuotaMb: initialValues.adminDailyQuotaMb,
      userMaxStorageMb: initialValues.userMaxStorageMb,
      adminMaxStorageMb: initialValues.adminMaxStorageMb,
      filesLimitUser: initialValues.filesLimitUser,
      filesLimitAdmin: initialValues.filesLimitAdmin,
      shortLinksLimitUser: initialValues.shortLinksLimitUser,
      shortLinksLimitAdmin: initialValues.shortLinksLimitAdmin,

      allowedMimePrefixes: (initialValues.allowedMimePrefixes ?? []).join(", "),
      disallowedExtensions: (initialValues.disallowedExtensions ?? []).join(
        ", "
      ),
      preservedUsernames: (initialValues.preservedUsernames ?? []).join(", "),

      passwordPolicyMinLength: initialValues.passwordPolicyMinLength,
    },
  });

  const [saving, setSaving] = React.useState(false);
  const v = form.watch();

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSaving(true);
    try {
      type Payload = Omit<
        FormValues,
        "allowedMimePrefixes" | "disallowedExtensions" | "preservedUsernames"
      > & {
        allowedMimePrefixes: string[] | null;
        disallowedExtensions: string[] | null;
        preservedUsernames: string[] | null;
      };

      const {
        allowedMimePrefixes: amp,
        disallowedExtensions: dex,
        preservedUsernames: pun,
        ...rest
      } = values;

      const payload: Payload = {
        ...rest,
        allowedMimePrefixes: amp ? strArrParser(amp) : null,
        disallowedExtensions: dex ? strArrParser(dex) : null,
        preservedUsernames: pun ? strArrParser(pun) : null,
      };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save settings");
      }

      toast.success("Settings saved", {
        description: "Server settings updated successfully.",
      });
    } catch (e) {
      toast.error("Save failed", {
        description: (e as Error).message ?? "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Server Settings"
      subtitle="Configure global settings for your application"
    >
      <div className="grid gap-6 w-full min-w-0">
        <Card title="Upload Limits">
          <p className="text-xs text-muted-foreground mb-3">
            Set per-file size, per-upload count, daily quotas, and total storage
            caps. Set 0 to mean no cap.
          </p>
          <Grid cols={2}>
            <Field
              label={
                <span className="inline-flex items-center">
                  Max file size (MB)
                  <HelpTip text="Largest single-file size allowed per upload. Ensure proxy (nginx/Cloudflare) and storage (S3/local) allow at least this size." />
                </span>
              }
              error={form.formState.errors.maxUploadMb?.message}
            >
              <Input type="number" {...form.register("maxUploadMb")} />
            </Field>
            <Field
              label={
                <span className="inline-flex items-center">
                  Max files per upload
                  <HelpTip text="How many files a user can include in a single upload request." />
                </span>
              }
              error={form.formState.errors.maxFilesPerUpload?.message}
            >
              <Input type="number" {...form.register("maxFilesPerUpload")} />
            </Field>
            <Field
              label={
                <span className="inline-flex items-center">
                  User daily quota (MB)
                  <HelpTip text="Total bytes a user may upload in a rolling 24-hour window. Set 0 for unlimited. Show remaining quota to users for clarity." />
                </span>
              }
              error={form.formState.errors.userDailyQuotaMb?.message}
            >
              <Input type="number" {...form.register("userDailyQuotaMb")} />
            </Field>
            <Field
              label={
                <span className="inline-flex items-center">
                  Admin daily quota (MB)
                  <HelpTip text="Daily upload cap for admins. Set 0 for unlimited." />
                </span>
              }
              error={form.formState.errors.adminDailyQuotaMb?.message}
            >
              <Input type="number" {...form.register("adminDailyQuotaMb")} />
            </Field>
            <Field
              label={
                <span className="inline-flex items-center">
                  User total storage cap (MB)
                  <HelpTip text="Maximum total storage per user account. When reached, uploads are blocked until files are deleted." />
                </span>
              }
              error={form.formState.errors.userMaxStorageMb?.message}
            >
              <Input type="number" {...form.register("userMaxStorageMb")} />
            </Field>
            <Field
              label={
                <span className="inline-flex items-center">
                  Admin total storage cap (MB)
                  <HelpTip text="Maximum total storage for admin accounts. Set 0 for unlimited." />
                </span>
              }
              error={form.formState.errors.adminMaxStorageMb?.message}
            >
              <Input type="number" {...form.register("adminMaxStorageMb")} />
            </Field>
          </Grid>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center">
              Vault Limits (per role)
              <HelpTip text="Per-type item caps per role. Leave empty to keep current value; use a very large number or a dedicated '0 means unlimited' policy if you prefer no cap." />
            </span>
          }
        >
          <Grid cols={2}>
            <Field
              label={
                <span className="inline-flex items-center">
                  Files — User limit
                  <HelpTip text="Maximum number of file records a non-admin can keep. Set high or leave unchanged for generous plans." />
                </span>
              }
            >
              <Input
                type="number"
                placeholder="1>"
                {...form.register("filesLimitUser")}
              />
            </Field>
            <Field label="Files — Admin limit">
              <Input
                type="number"
                placeholder="1>"
                {...form.register("filesLimitAdmin")}
              />
            </Field>

            <Field
              label={
                <span className="inline-flex items-center">
                  Short links — User limit
                  <HelpTip text="Maximum number of file records a non-admin can keep. Set high or leave unchanged for generous plans." />
                </span>
              }
            >
              <Input
                type="number"
                placeholder="1>"
                {...form.register("shortLinksLimitUser")}
              />
            </Field>
            <Field label="Short links — Admin limit">
              <Input
                type="number"
                placeholder="1>"
                {...form.register("shortLinksLimitAdmin")}
              />
            </Field>
          </Grid>
        </Card>

        <Card title="Security & Registration">
          <ToggleRow
            label={
              <span className="inline-flex items-center">
                Allow public registration
                <HelpTip text="If on, anyone can sign up. If off, only invited accounts or admin-created users can access." />
              </span>
            }
            checked={v.allowPublicRegistration}
            onCheckedChange={(c) =>
              form.setValue("allowPublicRegistration", c, { shouldDirty: true })
            }
          />
          <Field
            label={
              <span className="inline-flex items-center">
                Password min length
                <HelpTip text="Minimum required length for new passwords. Pair with 2FA for stronger security." />
              </span>
            }
          >
            <Input
              type="number"
              {...form.register("passwordPolicyMinLength")}
            />
          </Field>
          <Field
            label={
              <span className="inline-flex items-center">
                Preserved usernames (comma-separated)
                <HelpTip text="Reserved names that cannot be registered by users (e.g., admin, root). Prevents impersonation and confusion." />
              </span>
            }
          >
            <Input
              placeholder="admin, root, support"
              {...form.register("preservedUsernames")}
            />
          </Field>
        </Card>

        <Card title="Processing & Safety">
          <Grid cols={2}>
            <Field
              label={
                <span className="inline-flex items-center">
                  Allowed MIME prefixes (comma-separated)
                  <HelpTip text="Whitelist by prefix, e.g., image/, video/, audio/, application/pdf. Requests outside this list are rejected." />
                </span>
              }
            >
              <Input
                placeholder="image/, video/, audio/, application/pdf"
                {...form.register("allowedMimePrefixes")}
              />
            </Field>

            <Field
              label={
                <span className="inline-flex items-center">
                  Disallowed extensions (comma-separated)
                  <HelpTip text="Explicit denylist at filename level, e.g., .exe, .dll, .bat. This runs after MIME checks as a final safety net." />
                </span>
              }
            >
              <Input
                placeholder=".exe, .dll, .bat"
                {...form.register("disallowedExtensions")}
              />
            </Field>
          </Grid>
        </Card>

        <div className="flex items-center justify-end gap-3 sticky -bottom-2 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={() => form.handleSubmit(onSubmit)()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
