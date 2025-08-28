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

import { IconLock, IconLockOpen } from "@tabler/icons-react";
import React from "react";

export default function PublicBadge({
  isPublic,
  toggleVisibility,
}: {
  isPublic: boolean;
  toggleVisibility?: () => void;
}) {
  return (
    <div
      onClick={toggleVisibility}
      className="cursor-pointer hover:bg-muted p-1 rounded-full transition-all duration-300"
    >
      {isPublic ? (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2.5 py-1 text-xs font-medium">
            <IconLockOpen size={14} /> Public
          </span>
        </div>
      ) : (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 px-2.5 py-1 text-xs font-medium">
            <IconLock size={14} /> Private
          </span>
        </div>
      )}
    </div>
  );
}
