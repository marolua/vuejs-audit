import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: v-html XSS risk
 * Rendering raw HTML can lead to cross-site scripting vulnerabilities.
 */
export const noVHtml: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".vue")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inScript = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/<script[\s>]/)) inScript = true;
    if (line.match(/<\/script>/)) inScript = false;

    if (!inScript) {
      const match = line.match(/\bv-html\s*=/);
      if (match) {
        diagnostics.push({
          filePath,
          rule: "vue/no-v-html",
          category: "security",
          severity: "error",
          message: "`v-html` renders unescaped HTML — XSS risk",
          help: "Sanitize data with DOMPurify before passing to `v-html`, or use text interpolation `{{ }}` instead.",
          line: i + 1,
          col: (match.index ?? 0) + 1,
        });
      }
    }
  }

  return diagnostics;
};

/**
 * Rule: Hardcoded API keys or secrets in client code
 * Sensitive credentials should never be in frontend source.
 */
export const noHardcodedSecrets: RuleFn = (content, filePath) => {
  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect common patterns for hardcoded secrets
    const match = line.match(
      /(?:api[_-]?key|api[_-]?secret|auth[_-]?token|password|secret[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    );
    if (match) {
      diagnostics.push({
        filePath,
        rule: "vue/no-hardcoded-secrets",
        category: "security",
        severity: "error",
        message: "Possible hardcoded secret or API key",
        help: "Move secrets to environment variables (`.env`) and access via `import.meta.env`.",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

/**
 * Rule: Private runtime config exposed to client (Nuxt)
 * Using useRuntimeConfig().private in client-side code leaks secrets.
 */
export const noPrivateRuntimeConfigLeak: RuleFn = (content, filePath, project) => {
  if (!project.nuxt) return [];

  // Only flag in client-accessible files (not server/ directory)
  if (filePath.includes("/server/") || filePath.includes("\\server\\")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/useRuntimeConfig\(\)\.(?:private|secret)/);
    if (match) {
      diagnostics.push({
        filePath,
        rule: "vue/no-private-runtime-config-leak",
        category: "security",
        severity: "error",
        message: "Accessing private runtime config in client-accessible code",
        help: "Private runtime config is only available server-side. Use `useRuntimeConfig().public` for client code.",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

export const securityRules: RuleFn[] = [
  noVHtml,
  noHardcodedSecrets,
  noPrivateRuntimeConfigLeak,
];
