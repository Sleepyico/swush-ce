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

import { useEffect, useState } from "react";

const SCHEME_KEY = "swush-scheme";
const SCHEMES = [
  "Default",
  "Amoled",
  "Minimal",
  "Dracula",
  "Emerald",
  "Github-Dimmed",
  "Github-V1",
  "Gruvbox",
  "Nord",
  "Obsidian",
  "Rainbow",
  "Rose",
  "Palm",
  "Crimson",
  "Solarized",
] as const;
export type Scheme = (typeof SCHEMES)[number];

function toToken(s: Scheme): string {
  return s.toLowerCase();
}

function fromToken(token: string | null): Scheme {
  if (!token) return "Default";
  const found = SCHEMES.find((s) => s.toLowerCase() === token.toLowerCase());
  return found ?? "Default";
}

export function useColorScheme() {
  const [scheme, setScheme] = useState<Scheme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SCHEME_KEY);
      return fromToken(stored);
    }
    return "Default";
  });

  useEffect(() => {
    const token = toToken(scheme);
    document.documentElement.dataset.theme = token;
    localStorage.setItem(SCHEME_KEY, token);
  }, [scheme]);

  return { scheme, setScheme, SCHEMES };
}
