import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: Missing :key in v-for
 * Vue needs unique keys for efficient list diffing.
 */
export const noMissingVForKey: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      // Match v-for without :key or v-bind:key
      const vforMatch = line.match(/\bv-for\s*=/);
      if (vforMatch) {
        const hasKey = line.match(/:key\s*=|v-bind:key\s*=/);
        if (!hasKey) {
          // Check next few lines for multi-line attributes
          let found = false;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].match(/:key\s*=|v-bind:key\s*=/)) {
              found = true;
              break;
            }
            if (lines[j].match(/>/)) break;
          }
          if (!found) {
            diagnostics.push({
              filePath,
              rule: "vue/no-missing-v-for-key",
              category: "reactivity",
              severity: "warning",
              message: "`v-for` without `:key` binding",
              help: "Add a unique `:key` like `:key=\"item.id\"` for efficient list updates.",
              line: i + 1,
              col: (vforMatch.index ?? 0) + 1,
            });
          }
        }
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: v-if and v-for on the same element
 * In Vue 3, v-if takes precedence over v-for which can cause issues.
 */
export const noVIfWithVFor: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      if (line.match(/\bv-for\s*=/) && line.match(/\bv-if\s*=/)) {
        diagnostics.push({
          filePath,
          rule: "vue/no-v-if-with-v-for",
          category: "reactivity",
          severity: "warning",
          message: "`v-if` and `v-for` on the same element",
          help: "Move `v-if` to a wrapper `<template>` element or use a computed property to filter the list.",
          line: i + 1,
          col: 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Direct prop mutation
 * Props should be treated as readonly in Vue.
 */
export const noPropMutation: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  // Collect prop names from defineProps
  const propNames = new Set<string>();
  for (const line of lines) {
    // Match defineProps destructuring: const { foo, bar } = defineProps<...>()
    const destructMatch = line.match(/(?:const|let)\s+\{([^}]+)\}\s*=\s*defineProps/);
    if (destructMatch) {
      const names = destructMatch[1].split(",").map((n) => n.trim().split(/\s/)[0]);
      for (const n of names) {
        if (n) propNames.add(n);
      }
    }
    // Match const props = defineProps(...)
    const propsMatch = line.match(/(?:const|let)\s+(\w+)\s*=\s*defineProps/);
    if (propsMatch) {
      propNames.add(propsMatch[1]);
    }
  }

  if (propNames.size === 0) return [];

  let inScript = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (inScript) {
      for (const prop of propNames) {
        // Check for direct assignment to prop or prop.property
        const mutatePattern = new RegExp(`\\b${prop}\\s*=[^=]|\\b${prop}\\.\\w+\\s*=[^=]`);
        if (mutatePattern.test(line) && !line.includes("defineProps")) {
          diagnostics.push({
            filePath,
            rule: "vue/no-prop-mutation",
            category: "reactivity",
            severity: "error",
            message: `Direct mutation of prop \`${prop}\``,
            help: "Props are readonly. Emit an event to the parent or use a local copy with `ref()`.",
            line: i + 1,
            col: 1,
          });
        }
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: ref() without .value in script
 * Accessing ref without .value in <script> is a common mistake.
 */
export const noRefWithoutValue: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  // Collect ref variable names
  const refVars = new Set<string>();
  for (const line of lines) {
    const match = line.match(/(?:const|let)\s+(\w+)\s*=\s*ref\s*[<(]/);
    if (match) refVars.add(match[1]);
  }

  if (refVars.size === 0) return [];

  let inScript = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (inScript) {
      for (const v of refVars) {
        // Check for assignment without .value (but not the initial declaration)
        const assignPattern = new RegExp(`(?<!\\.)\\b${v}\\s*=[^=]`);
        if (assignPattern.test(line) && !line.includes("ref(") && !line.includes("ref<")) {
          diagnostics.push({
            filePath,
            rule: "vue/no-ref-without-value",
            category: "reactivity",
            severity: "error",
            message: `Ref \`${v}\` assigned without \`.value\``,
            help: `Use \`${v}.value = ...\` to update a ref in <script>.`,
            line: i + 1,
            col: 1,
          });
        }
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Options API usage in Vue 3 project
 * Composition API with <script setup> is the recommended approach.
 */
export const noOptionsApi: RuleFn = (content, filePath, project) => {
  if (!filePath.endsWith(".vue")) return [];
  // Only flag for Vue 3+
  if (project.vueVersion && !project.vueVersion.match(/[3-9]\./)) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;
  let isScriptSetup = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) {
      inScript = true;
      isScriptSetup = !!line.match(/\bsetup\b/);
    }
    if (line.match(/<\/script>/)) {
      inScript = false;
      isScriptSetup = false;
    }

    if (inScript && !isScriptSetup) {
      // Detect Options API patterns
      const optionsMatch = line.match(/\b(data\s*\(\s*\)|computed\s*:\s*\{|methods\s*:\s*\{|watch\s*:\s*\{|mounted\s*\(\s*\)|created\s*\(\s*\))/);
      if (optionsMatch) {
        diagnostics.push({
          filePath,
          rule: "vue/no-options-api",
          category: "reactivity",
          severity: "warning",
          message: "Options API detected — prefer Composition API with `<script setup>`",
          help: "Migrate to `<script setup>` with `ref()`, `computed()`, `watch()` for better TypeScript support and tree-shaking.",
          line: i + 1,
          col: (optionsMatch.index ?? 0) + 1,
        });
        break; // One warning per file is enough
      }
    }
  }

  return diagnostics;
};

export const reactivityRules: RuleFn[] = [
  noMissingVForKey,
  noVIfWithVFor,
  noPropMutation,
  noRefWithoutValue,
  noOptionsApi,
];
