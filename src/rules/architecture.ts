import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: Vuex usage in Vue 3 project
 * Pinia is the recommended state management for Vue 3.
 */
export const noVuexInVue3: RuleFn = (content, filePath, project) => {
  if (project.vueVersion && !project.vueVersion.match(/[3-9]\./)) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/import\s+.*\bfrom\s+['"]vuex['"]/);
    if (match) {
      diagnostics.push({
        filePath,
        rule: "vue/no-vuex-in-vue3",
        category: "architecture",
        severity: "warning",
        message: "Vuex detected — Pinia is the recommended store for Vue 3",
        help: "Migrate to Pinia for better TypeScript support, devtools integration, and simpler API.",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
      break; // One per file
    }
  }

  return diagnostics;
};

/**
 * Rule: Mixins usage
 * Mixins are discouraged in Vue 3 — use composables instead.
 */
export const noMixins: RuleFn = (content, filePath) => {
  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\bmixins\s*:\s*\[/);
    if (match) {
      diagnostics.push({
        filePath,
        rule: "vue/no-mixins",
        category: "architecture",
        severity: "warning",
        message: "Mixins are discouraged in Vue 3",
        help: "Extract shared logic into composables (`use*` functions) for better reuse and type safety.",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

/**
 * Rule: :deep() deprecated syntax
 * Using >>> or /deep/ is deprecated — use :deep() instead.
 */
export const noDeprecatedDeepSelector: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inStyle = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<style[\s>]/)) inStyle = true;
    if (line.match(/<\/style>/)) inStyle = false;

    if (inStyle) {
      const match = line.match(/>>>|\/deep\/|::v-deep(?!\()/);
      if (match) {
        diagnostics.push({
          filePath,
          rule: "vue/no-deprecated-deep-selector",
          category: "architecture",
          severity: "warning",
          message: `Deprecated deep selector \`${match[0]}\``,
          help: "Use `:deep()` instead — e.g., `:deep(.child-class) { ... }`.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Missing scoped on <style>
 * Unscoped styles leak globally and can cause unintended side effects.
 */
export const noUnscopedStyle: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const styleMatch = line.match(/<style(?![^>]*\bscoped\b)(?![^>]*\bmodule\b)[^>]*>/);
    if (styleMatch && !line.includes("</style>")) {
      diagnostics.push({
        filePath,
        rule: "vue/no-unscoped-style",
        category: "architecture",
        severity: "warning",
        message: "`<style>` without `scoped` or `module`",
        help: "Add `scoped` to `<style>` to prevent style leaks: `<style scoped>`.",
        line: i + 1,
        col: 1,
      });
    }
  }

  return diagnostics;
};

/**
 * Rule: Global CSS with :global() overuse
 * Excessive :global() bypasses component scoping.
 */
export const noGlobalCssOveruse: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inStyle = false;
  let globalCount = 0;
  let firstLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<style[\s>]/)) inStyle = true;
    if (line.match(/<\/style>/)) inStyle = false;

    if (inStyle) {
      const match = line.match(/:global\s*\(/);
      if (match) {
        globalCount++;
        if (globalCount === 1) firstLine = i + 1;
      }
    }
  }

  if (globalCount > 3) {
    diagnostics.push({
      filePath,
      rule: "vue/no-global-css-overuse",
      category: "architecture",
      severity: "warning",
      message: `${globalCount} uses of \`:global()\` — excessive global style overrides`,
      help: "Move truly global styles to a shared CSS file instead of overriding scoping.",
      line: firstLine,
      col: 1,
    });
  }

  return diagnostics;
};

export const architectureRules: RuleFn[] = [
  noVuexInVue3,
  noMixins,
  noDeprecatedDeepSelector,
  noUnscopedStyle,
  noGlobalCssOveruse,
];
