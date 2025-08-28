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

export const languages = [
  "typescript",
  "javascript",
  "json",
  "bash",
  "python",
  "html",
  "css",
  "sql",
  "go",
  "java",
  "c",
  "cpp",
];

export async function registerAndHighlight(
  node: HTMLElement,
  code: string,
  langHint: string
) {
  const hljs = (await import("highlight.js/lib/core")).default;

  async function register(lang: string): Promise<string> {
    const l = lang.toLowerCase();
    try {
      if (l === "typescript" || l === "ts") {
        const m = await import("highlight.js/lib/languages/typescript");
        hljs.registerLanguage("typescript", m.default);
        return "typescript";
      }
      if (l === "javascript" || l === "js") {
        const m = await import("highlight.js/lib/languages/javascript");
        hljs.registerLanguage("javascript", m.default);
        return "javascript";
      }
      if (l === "json") {
        const m = await import("highlight.js/lib/languages/json");
        hljs.registerLanguage("json", m.default);
        return "json";
      }
      if (l === "bash" || l === "sh" || l === "shell") {
        const m = await import("highlight.js/lib/languages/bash");
        hljs.registerLanguage("bash", m.default);
        return "bash";
      }
      if (l === "python" || l === "py") {
        const m = await import("highlight.js/lib/languages/python");
        hljs.registerLanguage("python", m.default);
        return "python";
      }
      if (l === "html" || l === "xml") {
        const m = await import("highlight.js/lib/languages/xml");
        hljs.registerLanguage("xml", m.default);
        return "xml";
      }
      if (l === "css") {
        const m = await import("highlight.js/lib/languages/css");
        hljs.registerLanguage("css", m.default);
        return "css";
      }
      if (l === "sql") {
        const m = await import("highlight.js/lib/languages/sql");
        hljs.registerLanguage("sql", m.default);
        return "sql";
      }
      if (l === "go" || l === "golang") {
        const m = await import("highlight.js/lib/languages/go");
        hljs.registerLanguage("go", m.default);
        return "go";
      }
      if (l === "java") {
        const m = await import("highlight.js/lib/languages/java");
        hljs.registerLanguage("java", m.default);
        return "java";
      }
      if (l === "c") {
        const m = await import("highlight.js/lib/languages/c");
        hljs.registerLanguage("c", m.default);
        return "c";
      }
      if (l === "cpp" || l === "c++") {
        const m = await import("highlight.js/lib/languages/cpp");
        hljs.registerLanguage("cpp", m.default);
        return "cpp";
      }
      return "plaintext";
    } catch {
      return "plaintext";
    }
  }

  const language = await register(langHint);
  const { value } = hljs.highlight(code ?? "", { language });
  node.innerHTML = value;
  node.setAttribute("data-highlighted", "true");
}
