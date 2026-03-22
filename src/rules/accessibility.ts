import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: Missing alt on <img>
 * Images must have alt text for screen readers.
 */
export const noMissingImgAlt: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      // Match <img tags
      const imgMatch = line.match(/<img\b/);
      if (imgMatch) {
        // Gather the full tag (may span multiple lines, but check current line first)
        // Simple heuristic: check if alt appears on the same line or is self-closing
        const hasAlt = line.match(/\balt\s*=/);
        const isClosed = line.match(/\/?\s*>/);

        if (!hasAlt && isClosed) {
          diagnostics.push({
            filePath,
            rule: "svelte/no-missing-img-alt",
            category: "accessibility",
            severity: "error",
            message: "`<img>` missing `alt` attribute",
            help: 'Add `alt="description"` or `alt=""` for decorative images.',
            line: i + 1,
            col: (imgMatch.index ?? 0) + 1,
          });
        }
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Click handlers without keyboard support
 * Interactive elements using on:click should also handle keyboard events.
 */
export const noClickWithoutKeyboard: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      // Match on:click or onclick on non-interactive elements (div, span, etc.)
      const clickMatch = line.match(
        /<(div|span|section|article|li|ul|p|header|footer|main|nav|aside)\b[^>]*(on:click|onclick)\b/,
      );
      if (clickMatch) {
        const hasKeyHandler = line.match(/on:keydown|on:keyup|on:keypress|onkeydown|onkeyup|onkeypress/);
        const hasRole = line.match(/role\s*=/);

        if (!hasKeyHandler || !hasRole) {
          const issues = [];
          if (!hasKeyHandler) issues.push("keyboard handler");
          if (!hasRole) issues.push("`role`");

          diagnostics.push({
            filePath,
            rule: "svelte/no-click-without-keyboard",
            category: "accessibility",
            severity: "warning",
            message: `\`<${clickMatch[1]}>\` has click handler but missing ${issues.join(" and ")}`,
            help: 'Add `role="button"` and `on:keydown` for keyboard accessibility.',
            line: i + 1,
            col: (clickMatch.index ?? 0) + 1,
          });
        }
      }
    }
  }

  return diagnostics;
};

export const accessibilityRules: RuleFn[] = [
  noMissingImgAlt,
  noClickWithoutKeyboard,
];
