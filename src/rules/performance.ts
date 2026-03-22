import type { Diagnostic, RuleFn } from "../types.js";

const MAX_COMPONENT_LINES = 300;

/**
 * Rule: Inline object/array props
 * Passing inline objects or arrays as props creates new references every render.
 */
export const noInlineObjectProps: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;
  let inTemplate = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;
    if (line.match(/<template[\s>]/)) inTemplate = true;
    if (line.match(/<\/template>/)) inTemplate = false;

    if (inTemplate && !inScript) {
      // Detect :prop="{ ... }" or :prop="[ ... ]" on component tags (PascalCase or kebab-case)
      const match = line.match(
        /(<[A-Z]\w*[\s-][^>]*|<[a-z]+-[a-z][^>]*):\w+="\s*(\{[^}]*\}|\[[^\]]*\])\s*"/,
      );
      if (match) {
        diagnostics.push({
          filePath,
          rule: "vue/no-inline-object-props",
          category: "performance",
          severity: "warning",
          message: "Inline object/array passed as prop",
          help: "Extract to a `const` or `computed()` to avoid creating a new reference on every render.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: v-for with index as key
 * Using index as key defeats the purpose of keyed rendering.
 */
export const noIndexKey: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      // Detect v-for="(item, index) in list" :key="index"
      const vforMatch = line.match(/v-for\s*=\s*"[^"]*,\s*(\w+)\s*\)/);
      if (vforMatch) {
        const indexVar = vforMatch[1];
        const keyMatch = line.match(new RegExp(`:key\\s*=\\s*"${indexVar}"`));
        if (keyMatch) {
          diagnostics.push({
            filePath,
            rule: "vue/no-index-key",
            category: "performance",
            severity: "warning",
            message: "Using loop index as `:key` in `v-for`",
            help: "Use a unique identifier like `item.id` instead of index for stable DOM updates.",
            line: i + 1,
            col: (keyMatch.index ?? 0) + 1,
          });
        }
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
  if (!filePath.endsWith(".vue")) return [];

  const lineCount = content.split("\n").length;
  if (lineCount > MAX_COMPONENT_LINES) {
    return [
      {
        filePath,
        rule: "vue/no-giant-component",
        category: "performance",
        severity: "warning",
        message: `Component is ${lineCount} lines (max ${MAX_COMPONENT_LINES})`,
        help: "Break the component into smaller, focused sub-components or extract logic into composables.",
        line: 1,
        col: 1,
      },
    ];
  }

  return [];
};

/**
 * Rule: Deep watchers on large objects
 * Using { deep: true } on watchers for large objects is expensive.
 */
export const noDeepWatcher: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue") && !filePath.endsWith(".ts")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/deep\s*:\s*true/);
    if (match && content.substring(0, content.split("\n").slice(0, i + 1).join("\n").length).match(/watch\s*\(/)) {
      diagnostics.push({
        filePath,
        rule: "vue/no-deep-watcher",
        category: "performance",
        severity: "warning",
        message: "Deep watcher detected — can be expensive on large objects",
        help: "Watch specific properties instead, or use `watchEffect` which auto-tracks dependencies.",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

export const performanceRules: RuleFn[] = [
  noInlineObjectProps,
  noIndexKey,
  noGiantComponent,
  noDeepWatcher,
];
