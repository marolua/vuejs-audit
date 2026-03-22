import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: Missing error.vue
 * Nuxt routes should have error boundaries for graceful error handling.
 */
export const noMissingErrorPage: RuleFn = (_content, filePath, project) => {
  if (!project.nuxt) return [];

  // Only check page files in pages/ directory
  if (!filePath.match(/pages[/\\]/) || !filePath.endsWith(".vue")) return [];

  // Check if error.vue exists at project root or in layouts
  const dir = dirname(filePath);
  let current = dir;
  let found = false;

  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(current, "error.vue"))) {
      found = true;
      break;
    }
    // Check if we've reached the project root (has nuxt.config)
    if (
      existsSync(join(current, "nuxt.config.ts")) ||
      existsSync(join(current, "nuxt.config.js"))
    ) {
      break;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  if (!found) {
    return [
      {
        filePath,
        rule: "vue/no-missing-error-page",
        category: "nuxt",
        severity: "warning",
        message: "No `error.vue` found in project",
        help: "Create an `error.vue` at the project root for graceful error handling.",
        line: 1,
        col: 1,
      },
    ];
  }

  return [];
};

/**
 * Rule: fetch() in component instead of useFetch/useAsyncData
 * In Nuxt 3, data fetching should use composables, not raw fetch in components.
 */
export const noFetchInComponent: RuleFn = (content, filePath, project) => {
  if (!project.nuxt) return [];
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (inScript) {
      // Look for raw fetch() calls (not useFetch, not $fetch)
      const match = line.match(/(?<!\$|use)\bfetch\s*\(/);
      if (match) {
        diagnostics.push({
          filePath,
          rule: "vue/no-fetch-in-component",
          category: "nuxt",
          severity: "warning",
          message: "Raw `fetch()` called in component",
          help: "Use `useFetch()`, `useAsyncData()`, or `$fetch()` for SSR-compatible data fetching in Nuxt.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Untyped definePageMeta
 * Page meta should use proper types for middleware, layout, etc.
 */
export const noUntypedPageMeta: RuleFn = (content, filePath, project) => {
  if (!project.nuxt || !project.typescript) return [];
  if (!filePath.match(/pages[/\\]/) || !filePath.endsWith(".vue")) return [];

  // Check if page uses definePageMeta
  const hasPageMeta = content.match(/definePageMeta/);
  if (hasPageMeta) return []; // Has page meta, good

  // Check if page has any auth/middleware needs (heuristic)
  const hasAuth = content.match(/useAuth|auth|middleware|protected/i);
  if (hasAuth) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/<script[\s>]/)) {
        return [
          {
            filePath,
            rule: "vue/no-untyped-page-meta",
            category: "nuxt",
            severity: "warning",
            message: "Page references auth/middleware but missing `definePageMeta()`",
            help: "Add `definePageMeta({ middleware: ['auth'] })` for route protection.",
            line: i + 1,
            col: 1,
          },
        ];
      }
    }
  }

  return [];
};

export const nuxtRules: RuleFn[] = [
  noMissingErrorPage,
  noFetchInComponent,
  noUntypedPageMeta,
];
