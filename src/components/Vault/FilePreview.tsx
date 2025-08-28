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

import { AudioWaveform } from "@/components/Files/AudioWaveform";
import {
  IconFile,
  IconFileText,
  IconFileTypePdf,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";

export function FileIcon({ mime }: { mime: string }) {
  let Icon = IconFile as typeof IconFile;
  if (mime.startsWith("image/")) Icon = IconPhoto;
  else if (mime.startsWith("video/")) Icon = IconVideo;
  else if (mime.startsWith("audio/")) Icon = IconMusic;
  else if (mime === "application/pdf") Icon = IconFileTypePdf;
  else if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript"
  )
    Icon = IconFileText;
  return (
    <div className="h-64 w-full grid place-items-center rounded-md border border-border bg-background">
      <Icon size={28} className="text-zinc-200" />
    </div>
  );
}

export default function FilePreview({
  mime,
  src,
  name,
  isPublic,
  hide,
}: {
  mime: string;
  src: string;
  name: string;
  isPublic?: boolean;
  hide?: boolean;
}) {
  if (hide) {
    return <FileIcon mime={mime} />;
  }
  if (mime.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="h-64 w-full object-cover rounded-md border border-border"
        loading="lazy"
      />
    );
  }
  if (mime.startsWith("video/")) {
    return (
      <video
        className="h-64 w-full object-cover rounded-md border border-border"
        src={src}
        muted
        playsInline
      />
    );
  }
  if (mime === "application/pdf") {
    return (
      <iframe
        src={src}
        title={name}
        className="w-full"
        style={{ height: "40vh", border: "none" }}
      />
    );
  }
  if (mime.startsWith("audio/")) {
    return <AudioWaveform src={src} isPublic={isPublic ?? false} />;
  }

  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    /\.txt$/i.test(name)
  ) {
    return (
      <iframe
        src={src}
        title={name}
        className="w-full h-[40vh] rounded-lg border"
      />
    );
  }
  return (
    <div className="h-64 w-full grid place-items-center rounded-md border border-border bg-background">
      <IconFile size={28} className="text-zinc-200" />
    </div>
  );
}
