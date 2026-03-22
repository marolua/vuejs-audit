import type { Diagnostic, RuleFn } from "../types.js";

const MAX_STORES_PER_FILE = 5;

/**
 * Rule: Overuse of writable stores
 * Too many writable stores in one file suggests the state could be
 * consolidated or moved to a context/rune-based approach.
 */
export const noWritableStoreOveruse: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) return [];

  const lines = content.split("\n");
  let count = 0;
  let firstLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/\bwritable\s*\(/)) {
      count++;
      if (count === 1) firstLine = i + 1;
    }
  }

  if (count > MAX_STORES_PER_FILE) {
    return [
      {
        filePath,
        rule: "svelte/no-writable-store-overuse",
        category: "architecture",
        severity: "warning",
        message: `${count} writable stores in one file (max ${MAX_STORES_PER_FILE})`,
        help: "Consider consolidating related state into a single store or using Svelte 5 runes.",
        line: firstLine,
        col: 1,
      },
    ];
  }

  return [];
};

/**
 * Rule: :global() CSS usage
 * Global styles bypass component scoping and can cause unintended side effects.
 */
export const noGlobalCss: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inStyle = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<style[\s>]/)) inStyle = true;
    if (line.match(/<\/style>/)) inStyle = false;

    if (inStyle) {
      const match = line.match(/:global\s*\(/);
      if (match) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-global-css",
          category: "architecture",
          severity: "warning",
          message: "`:global()` CSS bypasses component scoping",
          help: "Prefer scoped styles or use a shared CSS file for truly global rules.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Circular store dependencies
 * Detect stores that subscribe to each other (import + subscribe pattern).
 */
export const noCircularStoreDeps: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) return [];
  if (!filePath.includes("store")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  // Collect store imports from other store files
  const storeImports: { name: string; source: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(
      /import\s+\{([^}]+)\}\s+from\s+['"](\.\/[^'"]*store[^'"]*)['"]/,
    );
    if (match) {
      const names = match[1].split(",").map((n) => n.trim());
      for (const name of names) {
        storeImports.push({ name, source: match[2], line: i + 1 });
      }
    }
  }

  // Check if any imported store is subscribed to AND a store is exported
  const exportsStore = content.match(/export\s+(const|let|function)\s+\w+\s*=\s*writable/);
  const subscribes = storeImports.filter((imp) =>
    content.match(new RegExp(`\\b${imp.name}\\.subscribe|get\\(${imp.name}\\)|\\$${imp.name}\\b`)),
  );

  if (exportsStore && subscribes.length > 0) {
    for (const sub of subscribes) {
      diagnostics.push({
        filePath,
        rule: "svelte/no-circular-store-deps",
        category: "architecture",
        severity: "warning",
        message: `Store imports and subscribes to \`${sub.name}\` from \`${sub.source}\` — potential circular dependency`,
        help: "Extract shared state into a separate store to break the cycle.",
        line: sub.line,
        col: 1,
      });
    }
  }

  return diagnostics;
};

export const architectureRules: RuleFn[] = [
  noWritableStoreOveruse,
  noGlobalCss,
  noCircularStoreDeps,
];
