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
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  type: string;
};

type SearchGroup = {
  label: string;
  items: SearchItem[];
};

function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function GlobalCommand() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebounced(q, 200);
  const [loading, setLoading] = React.useState(false);
  const [groups, setGroups] = React.useState<SearchGroup[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const metaK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      const slash =
        e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
      if (metaK || slash) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (!debouncedQ?.trim()) {
      setGroups([]);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`, {
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error((await r.json())?.message || "Search failed");
        return r.json();
      })
      .then((json) => setGroups(json.groups || []))
      .catch((err) => {
        if (err.name !== "AbortError")
          console.error("global search error", err);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [debouncedQ, open]);

  function go(item: SearchItem) {
    if (item.href) {
      router.push(item.href);
      setOpen(false);
    } else {
      setQ(item.title);
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder="Search anything… (⌘K)"
        autoFocus
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          {loading ? "Searching…" : q ? "No results" : "Type to search"}
        </CommandEmpty>

        {groups.map((g) =>
          g.items.length ? (
            <CommandGroup key={g.label} heading={g.label}>
              {g.items.map((it) => (
                <CommandItem
                  key={`${g.label}:${it.id}`}
                  value={`${it.title} ${it.subtitle ?? ""}`.trim()}
                  onSelect={() => go(it)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="truncate w-full">{it.title}</span>
                  {it.subtitle ? (
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {it.subtitle}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null
        )}

        {!!groups.length && <CommandSeparator />}
      </CommandList>
    </CommandDialog>
  );
}
