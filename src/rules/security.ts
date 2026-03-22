import type { Diagnostic, RuleFn } from "../types.js";

/**
 * Rule: {@html} XSS risk
 * Rendering raw HTML can lead to cross-site scripting vulnerabilities.
 */
export const noHtmlDirective: RuleFn = (content, filePath) => {
  if (!filePath.endsWith(".svelte")) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\{@html\b/);
    if (match) {
      diagnostics.push({
        filePath,
        rule: "svelte/no-html-directive",
        category: "security",
        severity: "error",
        message: "`{@html}` renders unescaped HTML — XSS risk",
        help: "Sanitize data before passing to `{@html}`, or use DOM APIs instead.",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

/**
 * Rule: Private env vars exposed to client
 * Importing from $env/static/private or $env/dynamic/private in client code leaks secrets.
 */
export const noPrivateEnvLeak: RuleFn = (content, filePath, project) => {
  if (!project.svelteKit) return [];

  // Only flag in client-accessible files (not +server, +page.server, +layout.server, etc.)
  const isServerFile =
    filePath.includes("+server") ||
    filePath.includes("+page.server") ||
    filePath.includes("+layout.server") ||
    filePath.match(/\.server\.(ts|js)$/);

  if (isServerFile) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(
      /import\s+.+\s+from\s+['"]\$env\/(static|dynamic)\/private['"]/,
    );
    if (match) {
      diagnostics.push({
        filePath,
        rule: "svelte/no-private-env-leak",
        category: "security",
        severity: "error",
        message: `Importing from \`$env/${match[1]}/private\` in client-accessible code`,
        help: "Private env vars must only be used in server files (+page.server, +server, etc.).",
        line: i + 1,
        col: (match.index ?? 0) + 1,
      });
    }
  }

  return diagnostics;
};

export const securityRules: RuleFn[] = [noHtmlDirective, noPrivateEnvLeak];
