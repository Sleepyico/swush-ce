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

import { useState } from "react";

export type Id = string | null | undefined;

export function useBulkSelect() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isSelected = (id?: Id) => !!id && selectedIds.includes(id);

  const toggleOne = (id?: Id) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePage = (ids: Id[]) => {
    const pageIds = (ids.filter(Boolean) as string[]).map(String);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...prev, ...pageIds]))
    );
  };

  const selectAll = (ids: Id[]) => {
    setSelectedIds(Array.from(new Set(ids.filter(Boolean) as string[])));
  };

  const clear = () => setSelectedIds([]);

  const count = selectedIds.length;

  async function performBulk(
    ids: string[],
    exec: (id: string) => Promise<Response | void>
  ): Promise<{ ok: number; fail: { id: string; error: string }[] }> {
    const tasks = await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await exec(id);
          if (res && res instanceof Response && !res.ok) {
            const j = await res.json();
            return {
              id,
              ok: false as const,
              error: j?.error || `Failed (${res.status})`,
            };
          }
          return { id, ok: true as const };
        } catch (e) {
          return { id, ok: false as const, error: (e as Error).message };
        }
      })
    );
    const ok = tasks.filter((t) => t.ok).length;
    const fail = tasks.filter((t) => !t.ok) as { id: string; error: string }[];
    return { ok, fail };
  }

  return {
    selectedIds,
    isSelected,
    toggleOne,
    togglePage,
    selectAll,
    clear,
    count,
    performBulk,
  };
}
