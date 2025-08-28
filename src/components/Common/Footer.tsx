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

import React from "react";

export default function Footer() {
  const visitDeveloper = () => {
    window.open("https://iconical.dev", "_blank");
  };
  return (
    <footer className="border-t py-6">
      <div
        className="text-center text-xs text-muted-foreground hover:cursor-pointer hover:text-primary"
        onClick={visitDeveloper}
      >
        © 2025 Laith Alkhaddam (Iconical / Sleepyico).
        <br />
        All rights reserved.
      </div>
    </footer>
  );
}
