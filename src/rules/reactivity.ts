import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: Missing keys in {#each} blocks
 * Svelte needs keys for efficient list diffing.
 */
export const noMissingEachKey: RuleFn = (content, filePath) => {
  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match {#each array as item} without (key) part
    const match = line.match(/\{#each\s+\S+\s+as\s+\S+(?:\s*,\s*\w+)?\s*\}/);
    if (match) {
      // Check it doesn't have a key expression like (item.id)
      if (!line.match(/\{#each\s+.+\s+as\s+.+\(.*\)/)) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-missing-each-key",
          category: "reactivity",
          severity: "warning",
          message: "`{#each}` block without a key expression",
          help: "Add a key like `{#each items as item (item.id)}` for efficient list updates",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Legacy $: reactive declarations (Svelte 4 pattern)
 * In Svelte 5+, use $derived and $effect instead.
 */
export const noLegacyReactiveDeclarations: RuleFn = (content, filePath, project) => {
  // Only flag if the project is on Svelte 5+
  if (project.svelteVersion && !project.svelteVersion.match(/[5-9]\./)) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (inScript && line.match(/^\s*\$:\s/)) {
      diagnostics.push({
        filePath,
        rule: "svelte/no-legacy-reactive-declarations",
        category: "reactivity",
        severity: "warning",
        message: "Legacy `$:` reactive declaration",
        help: "Use `$derived` for computed values or `$effect` for side effects (Svelte 5 runes)",
        line: i + 1,
        col: (line.match(/\$:/)?.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

/**
 * Rule: Reassigning a $derived value
 * $derived values are read-only; reassignment won't work as expected.
 */
export const noDerivedReassignment: RuleFn = (content, filePath) => {
  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  // Collect $derived variable names
  const derivedVars = new Set<string>();
  for (const line of lines) {
    const match = line.match(/let\s+(\w+)\s*=\s*\$derived/);
    if (match) derivedVars.add(match[1]);
  }

  if (derivedVars.size === 0) return [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const v of derivedVars) {
      // Check for reassignment (not the initial declaration)
      const reassign = new RegExp(`(?<!let\\s+)\\b${v}\\s*=[^=]`);
      if (reassign.test(line) && !line.includes("$derived")) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-derived-reassignment",
          category: "reactivity",
          severity: "error",
          message: `Reassignment of \`$derived\` variable \`${v}\``,
          help: "`$derived` values are read-only. Update the source data instead.",
          line: i + 1,
          col: (line.match(new RegExp(`\\b${v}\\s*=`))?.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: $effect write loops
 * Writing to reactive state inside $effect can cause infinite loops.
 */
export const noEffectWriteLoop: RuleFn = (content, filePath) => {
  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  // Only analyze inside <script> blocks
  let inScript = false;

  // Collect $state variable names from script blocks
  const stateVars = new Set<string>();
  for (const line of lines) {
    const match = line.match(/let\s+(\w+)\s*=\s*\$state/);
    if (match) stateVars.add(match[1]);
  }

  if (stateVars.size === 0) return [];

  let inEffect = false;
  let braceDepth = 0;
  let effectBodyDepth = 0;
  let effectStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) {
      inScript = false;
      inEffect = false;
      braceDepth = 0;
    }

    if (!inScript) continue;

    if (line.includes("$effect(")) {
      inEffect = true;
      braceDepth = 0;
      effectStartLine = i;
    }

    if (inEffect) {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }

      // Record the effect body depth (the { right after $effect(() => {)
      if (i === effectStartLine) {
        effectBodyDepth = braceDepth;
      }

      // Only flag writes at the direct effect body level, not inside nested
      // callbacks (event handlers, setTimeout, etc.) which won't cause loops
      if (braceDepth >= effectBodyDepth && braceDepth <= effectBodyDepth) {
        for (const v of stateVars) {
          const writePattern = new RegExp(`\\b${v}\\s*=[^=]`);
          if (writePattern.test(line) && !line.includes("$effect")) {
            diagnostics.push({
              filePath,
              rule: "svelte/no-effect-write-loop",
              category: "reactivity",
              severity: "error",
              message: `Writing to \`$state\` variable \`${v}\` inside \`$effect\` may cause an infinite loop`,
              help: "Use `$effect` only for side effects. Derive values with `$derived` or use `untrack()`.",
              line: i + 1,
              col: (line.match(new RegExp(`\\b${v}\\s*=`))?.index ?? 0) + 1,
            });
          }
        }
      }

      if (braceDepth <= 0 && i > effectStartLine) {
        inEffect = false;
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Deprecated lifecycle hooks
 * In Svelte 5, onMount/onDestroy/beforeUpdate/afterUpdate are replaced by $effect.
 */
export const noDeprecatedLifecycle: RuleFn = (content, filePath, project) => {
  if (project.svelteVersion && !project.svelteVersion.match(/[5-9]\./)) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  const deprecated = ["beforeUpdate", "afterUpdate"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const hook of deprecated) {
      if (line.match(new RegExp(`\\b${hook}\\b`)) && line.match(/import|from\s+['"]svelte['"]/)) {
        diagnostics.push({
          filePath,
          rule: "svelte/no-deprecated-lifecycle",
          category: "reactivity",
          severity: "warning",
          message: `\`${hook}\` is deprecated in Svelte 5`,
          help: "Use `$effect` or `$effect.pre` instead.",
          line: i + 1,
          col: (line.indexOf(hook)) + 1,
        });
      }
    }
  }

  return diagnostics;
};

export const reactivityRules: RuleFn[] = [
  noMissingEachKey,
  noLegacyReactiveDeclarations,
  noDerivedReassignment,
  noEffectWriteLoop,
  noDeprecatedLifecycle,
];
