import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: console.log in components
 * Leftover console statements clutter production output.
 */
export const noConsoleInComponent: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

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
          rule: "vue/no-console-in-component",
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
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Single-line empty script
    if (line.match(/<script[^>]*>\s*<\/script>/)) {
      diagnostics.push({
        filePath,
        rule: "vue/no-empty-script",
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
      const next = lines[i + 1]?.trim();
      if (next === "</script>") {
        diagnostics.push({
          filePath,
          rule: "vue/no-empty-script",
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

/**
 * Rule: Missing <script setup> lang="ts" when TypeScript is used
 * Ensures Vue components use TypeScript when the project uses it.
 */
export const noMissingScriptSetup: RuleFn = (content, filePath, project) => {
  if (!filePath.endsWith(".vue")) return [];
  if (!project.typescript) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for <script> without setup attribute
    const scriptMatch = line.match(/<script(?![^>]*\bsetup\b)[^>]*>/);
    if (scriptMatch && !line.includes("</script>")) {
      // Ignore module scripts like <script lang="ts"> used alongside <script setup>
      const hasSetupScript = content.match(/<script[^>]*\bsetup\b/);
      if (!hasSetupScript) {
        diagnostics.push({
          filePath,
          rule: "vue/no-missing-script-setup",
          category: "correctness",
          severity: "warning",
          message: "`<script>` without `setup` attribute",
          help: "Use `<script setup lang=\"ts\">` for better DX, TypeScript support, and smaller bundle.",
          line: i + 1,
          col: 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Unused components registered
 * Detect components imported but never used in template.
 */
export const noUnusedComponents: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];
  // Only check script setup files
  if (!content.match(/<script[^>]*\bsetup\b/)) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  // Extract template content
  const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (!templateMatch) return [];
  const templateContent = templateMatch[1];

  // Find component imports (PascalCase)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const importMatch = line.match(/import\s+([A-Z]\w+)\s+from/);
    if (importMatch) {
      const componentName = importMatch[1];
      // Check template for PascalCase or kebab-case usage
      const kebabName = componentName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      const isUsed =
        templateContent.includes(`<${componentName}`) ||
        templateContent.includes(`<${kebabName}`) ||
        templateContent.includes(`:is="${componentName}"`) ||
        templateContent.includes(`:is="${kebabName}"`);

      if (!isUsed) {
        diagnostics.push({
          filePath,
          rule: "vue/no-unused-components",
          category: "correctness",
          severity: "warning",
          message: `Component \`${componentName}\` imported but never used in template`,
          help: "Remove the unused import or add the component to the template.",
          line: i + 1,
          col: (importMatch.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

export const correctnessRules: RuleFn[] = [
  noConsoleInComponent,
  noEmptyScript,
  noMissingScriptSetup,
  noUnusedComponents,
];
