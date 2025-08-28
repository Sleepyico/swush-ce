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

import { useState, useEffect } from "react";

export function useLocalStorageBoolean(key: string, defaultValue = false) {
  const [value, setValue] = useState<boolean>(defaultValue);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(key);
        if (stored === "1") setValue(true);
        else if (stored === "0") setValue(false);
      }
    } catch {
      // Ignore please >.<
    }
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Ignore please >.<
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function useLocalStorageString(key: string, defaultValue: string) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored);
    } catch {
      // Ignore please >.<
    }
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore please >.<
    }
  }, [key, value]);

  return [value, setValue] as const;
}
