import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: Missing +error.svelte
 * SvelteKit routes should have error boundaries for graceful error handling.
 */
export const noMissingErrorPage: RuleFn = (_content, filePath, project) => {
  if (!project.svelteKit) return [];

  // Only check +page.svelte files
  if (!filePath.endsWith("+page.svelte")) return [];

  const dir = dirname(filePath);
  const errorPage = join(dir, "+error.svelte");

  // Walk up to find any +error.svelte in parent route directories
  let current = dir;
  let found = false;

  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(current, "+error.svelte"))) {
      found = true;
      break;
    }
    // Check if we've reached the routes directory
    if (current.endsWith("routes") || current.endsWith("src")) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  if (!found) {
    return [
      {
        filePath,
        rule: "svelte/no-missing-error-page",
        category: "sveltekit",
        severity: "warning",
        message: "No `+error.svelte` found in route hierarchy",
        help: `Create \`${errorPage}\` (or in a parent route) for graceful error handling.`,
        line: 1,
        col: 1,
      },
    ];
  }

  return [];
};

/**
 * Rule: Untyped load functions
 * SvelteKit load functions should use generated types for type safety.
 */
export const noUntypedLoad: RuleFn = (content, filePath, project) => {
  if (!project.svelteKit || !project.typescript) return [];

  // Only check +page.ts, +layout.ts, +page.server.ts, +layout.server.ts
  if (
    !filePath.match(/\+(page|layout)(\.server)?\.ts$/)
  ) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match export function/const load without type annotation from ./$types
    const match = line.match(
      /export\s+(const|function)\s+load\b/,
    );
    if (match) {
      // Check if types are imported from ./$types
      const hasTypeImport = content.match(
        /import\s+.*\bPageLoad\b|import\s+.*\bPageServerLoad\b|import\s+.*\bLayoutLoad\b|import\s+.*\bLayoutServerLoad\b|import\s+.*\bLoad\b.*from\s+['"]\.\/\$types['"]/,
      );
      const hasSatisfies = line.includes("satisfies");
      const hasTypeAnnotation = line.match(/:\s*(PageLoad|PageServerLoad|LayoutLoad|LayoutServerLoad)\b/);

      if (!hasTypeImport && !hasSatisfies && !hasTypeAnnotation) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-untyped-load",
          category: "sveltekit",
          severity: "warning",
          message: "Load function missing type annotation",
          help: "Import types from `./$types` for type-safe params and return values:\n`import type { PageLoad } from './$types';`",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

export const sveltekitRules: RuleFn[] = [
  noMissingErrorPage,
  noUntypedLoad,
];
