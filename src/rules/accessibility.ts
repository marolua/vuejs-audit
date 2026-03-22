import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: Missing alt on <img>
 * Images must have alt text for screen readers.
 */
export const noMissingImgAlt: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      const imgMatch = line.match(/<img\b/);
      if (imgMatch) {
        const hasAlt = line.match(/\balt\s*=/);
        const isClosed = line.match(/\/?\s*>/);

        if (!hasAlt && isClosed) {
          diagnostics.push({
            filePath,
            rule: "vue/no-missing-img-alt",
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
 * Non-interactive elements with @click should also handle keyboard events.
 */
export const noClickWithoutKeyboard: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      // Match @click or v-on:click on non-interactive elements
      const clickMatch = line.match(
        /<(div|span|section|article|li|ul|p|header|footer|main|nav|aside)\b[^>]*(@click|v-on:click)\b/,
      );
      if (clickMatch) {
        const hasKeyHandler = line.match(/@keydown|@keyup|@keypress|v-on:keydown|v-on:keyup|v-on:keypress/);
        const hasRole = line.match(/role\s*=/);

        if (!hasKeyHandler || !hasRole) {
          const issues = [];
          if (!hasKeyHandler) issues.push("keyboard handler");
          if (!hasRole) issues.push("`role`");

          diagnostics.push({
            filePath,
            rule: "vue/no-click-without-keyboard",
            category: "accessibility",
            severity: "warning",
            message: `\`<${clickMatch[1]}>\` has \`@click\` but missing ${issues.join(" and ")}`,
            help: 'Add `role="button"` and `@keydown.enter` for keyboard accessibility.',
            line: i + 1,
            col: (clickMatch.index ?? 0) + 1,
          });
        }
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Missing form labels
 * Form inputs should have associated <label> elements.
 */
export const noMissingFormLabel: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      // Match <input>, <select>, <textarea> without aria-label or id (for label association)
      const inputMatch = line.match(/<(input|select|textarea)\b/);
      if (inputMatch) {
        const hasLabel =
          line.match(/aria-label\s*=/) ||
          line.match(/aria-labelledby\s*=/) ||
          line.match(/\bid\s*=/);
        const isHidden = line.match(/type\s*=\s*"hidden"/);

        if (!hasLabel && !isHidden) {
          diagnostics.push({
            filePath,
            rule: "vue/no-missing-form-label",
            category: "accessibility",
            severity: "warning",
            message: `\`<${inputMatch[1]}>\` without label association`,
            help: "Add an `id` and matching `<label for=\"...\">`, or use `aria-label`.",
            line: i + 1,
            col: (inputMatch.index ?? 0) + 1,
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
  noMissingFormLabel,
];
