import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: {@debug} left in code
 * Debug tags should be removed before production.
 */
export const noDebugTag: RuleFn = (content, filePath) => {
  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\{@debug\b/);
    if (match) {
      diagnostics.push({
        filePath,
        rule: "svelte/no-debug-tag",
        category: "correctness",
        severity: "warning",
        message: "`{@debug}` tag left in code",
        help: "Remove `{@debug}` before deploying to production.",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

/**
 * Rule: console.log in components
 * Leftover console statements clutter production output.
 */
export const noConsoleInComponent: RuleFn = (content, filePath) => {
  // Only check .svelte files
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (inScript) {
      const match = line.match(/\bconsole\.(log|warn|error|info|debug|trace)\s*\(/);
      if (match) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-console-in-component",
          category: "correctness",
          severity: "warning",
          message: `\`console.${match[1]}()\` left in component`,
          help: "Remove console statements or use a proper logging utility.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Empty <script> blocks
 * Empty script blocks are unnecessary noise.
 */
export const noEmptyScript: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Single-line empty script
    if (line.match(/<script[^>]*>\s*<\/script>/)) {
      diagnostics.push({
        filePath,
        rule: "svelte/no-empty-script",
        category: "correctness",
        severity: "warning",
        message: "Empty `<script>` block",
        help: "Remove the empty `<script>` block — it serves no purpose.",
        line: i + 1,
        col: 1,
      });
      continue;
    }

    // Multi-line empty script
    if (line.match(/<script[^>]*>\s*$/)) {
      // Look ahead for immediate close
      const next = lines[i + 1]?.trim();
      if (next === "</script>") {
        diagnostics.push({
          filePath,
          rule: "svelte/no-empty-script",
          category: "correctness",
          severity: "warning",
          message: "Empty `<script>` block",
          help: "Remove the empty `<script>` block — it serves no purpose.",
          line: i + 1,
          col: 1,
        });
      }
    }
  }

  return diagnostics;
};

export const correctnessRules: RuleFn[] = [
  noDebugTag,
  noConsoleInComponent,
  noEmptyScript,
];
