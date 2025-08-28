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

import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/constant";
import { IconCopy, IconDownload, IconEye } from "@tabler/icons-react";
import { toast } from "sonner";

type Props = {
  viewUrl: string;
  rawUrl: string;
  downloadName: string;
  password?: string;
  mime: string;
};

export default function ClientFileActions({
  viewUrl,
  rawUrl,
  downloadName,
  password,
  mime,
}: Props) {
  const downloadHref = password
    ? `${rawUrl}?p=${encodeURIComponent(password)}`
    : rawUrl;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <Button asChild className="gap-2 rounded-full px-5 py-3 shadow-sm">
        <a
          href={downloadHref}
          download={downloadName}
          onClick={() => toast.success(`Download starting… ${downloadName}`)}
        >
          <IconDownload />
          <span>Download</span>
        </a>
      </Button>
      <Button
        variant="outline"
        className="gap-2 rounded-full px-5 shadow-sm"
        onClick={async () => {
          const url = new URL(viewUrl, APP_URL);
          if (password) {
            url.searchParams.set("p", password);
          }
          const raw = url.toString();
          await navigator.clipboard.writeText(raw);
          toast.success("Page link copied", {
            description: raw,
          });
        }}
      >
        <IconEye />
        <span>Copy page link</span>
      </Button>
      <Button
        variant="outline"
        className="gap-2 rounded-full px-5 shadow-sm"
        onClick={async () => {
          const url = new URL(rawUrl, APP_URL);
          if (password) {
            url.searchParams.set("p", password);
          }
          const raw = url.toString();
          await navigator.clipboard.writeText(raw);
          toast.success("Raw link copied");
        }}
      >
        <IconCopy />
        <span>Copy raw link</span>
      </Button>
      <Button
        variant="outline"
        className="gap-2 rounded-full px-5 shadow-sm"
        onClick={async () => {
          const url = new URL(`${rawUrl}.${mime.split("/")[1]}`, APP_URL);
          if (password) {
            url.searchParams.set("p", password);
          }
          const raw = url.toString();
          await navigator.clipboard.writeText(raw);
          toast.success("Raw link copied");
        }}
      >
        <IconCopy />
        <span>Copy raw link with .extension</span>
      </Button>
    </div>
  );
}
