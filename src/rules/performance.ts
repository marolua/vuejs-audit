import type { Diagnostic, RuleFn } from "../types.js";

const MAX_COMPONENT_LINES = 300;

/**
 * Rule: Inline object/array props
 * Passing inline objects or arrays as props creates new references every render.
 */
export const noInlineObjectProps: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inTemplate = true;
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) {
      inScript = true;
      inTemplate = false;
    }
    if (line.match(/<\/script>/)) {
      inScript = false;
      inTemplate = true;
    }

    if (!inScript && inTemplate) {
      // Detect prop={{ ... }} or prop={[ ... ]} on component tags (uppercase)
      const match = line.match(
        /(<[A-Z]\w*\s[^>]*)\b\w+=\{\s*(\{[^}]*\}|\[[^\]]*\])\s*\}/,
      );
      if (match) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-inline-object-props",
          category: "performance",
          severity: "warning",
          message: "Inline object/array passed as prop",
          help: "Extract to a variable to avoid creating a new reference on every render.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: fetch() in component instead of load function
 * In SvelteKit, data fetching belongs in +page.ts load functions, not components.
 */
export const noFetchInComponent: RuleFn = (content, filePath, project) => {
  if (!project.svelteKit) return [];
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (inScript) {
      // Look for fetch() calls, await fetch(), etc.
      const match = line.match(/\bfetch\s*\(/);
      if (match) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-fetch-in-component",
          category: "performance",
          severity: "warning",
          message: "`fetch()` called directly in component",
          help: "Move data fetching to a `+page.ts` or `+page.server.ts` load function.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Giant components (>300 lines)
 * Large components are hard to maintain and test.
 */
export const noGiantComponent: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".svelte")) return [];

  const lineCount = content.split("\n").length;
  if (lineCount > MAX_COMPONENT_LINES) {
    return [
      {
        filePath,
        rule: "svelte/no-giant-component",
        category: "performance",
        severity: "warning",
        message: `Component is ${lineCount} lines (max ${MAX_COMPONENT_LINES})`,
        help: "Break the component into smaller, focused sub-components.",
        line: 1,
        col: 1,
      },
    ];
  }

  return [];
};

export const performanceRules: RuleFn[] = [
  noInlineObjectProps,
  noFetchInComponent,
  noGiantComponent,
];
