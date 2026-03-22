import pc from "picocolors";
import type { Diagnostic, Category } from "./types.js";

const CATEGORY_LABELS: Record<Category, string> = {
  reactivity: "Reactivity",
  correctness: "Correctness",
  security: "Security",
  performance: "Performance",
  accessibility: "Accessibility",
  architecture: "Architecture",
  nuxt: "Nuxt",
};

const CATEGORY_ICONS: Record<Category, string> = {
  reactivity: "~",
  correctness: "!",
  security: "#",
  performance: ">",
  accessibility: "@",
  architecture: "&",
  nuxt: "+",
};

export function formatScore(score: number, label: string): string {
  const barWidth = 40;
  const filled = Math.round((score / 100) * barWidth);
  const empty = barWidth - filled;

  const colorize = score >= 85 ? pc.green : score >= 50 ? pc.yellow : pc.red;

  const bar = colorize("\u2588".repeat(filled)) + pc.dim("\u2591".repeat(empty));
  const scoreText = colorize(pc.bold(`${score}`));

  const lines = [
    "",
    frameLine(`  Health Score: ${score}/100 — ${label}  `, colorize),
    "",
    `  ${bar}  ${scoreText}/100`,
    "",
  ];

  return lines.join("\n");
}

export function formatDiagnostics(
  diagnostics: Diagnostic[],
  verbose: boolean,
): string {
  if (diagnostics.length === 0) {
    return pc.green("\n  No issues found. Your Vue code is healthy!\n");
  }

  // Group by category
  const grouped = new Map<Category, Diagnostic[]>();
  for (const d of diagnostics) {
    const list = grouped.get(d.category) ?? [];
    list.push(d);
    grouped.set(d.category, list);
  }

  const lines: string[] = [""];

  // Sort categories by severity (errors first)
  const sortedCategories = [...grouped.entries()].sort((a, b) => {
    const aErrors = a[1].filter((d) => d.severity === "error").length;
    const bErrors = b[1].filter((d) => d.severity === "error").length;
    return bErrors - aErrors;
  });

  for (const [category, diags] of sortedCategories) {
    const icon = CATEGORY_ICONS[category];
    const label = CATEGORY_LABELS[category];
    const errors = diags.filter((d) => d.severity === "error").length;
    const warnings = diags.filter((d) => d.severity === "warning").length;

    const counts: string[] = [];
    if (errors > 0) counts.push(pc.red(`${errors} error${errors > 1 ? "s" : ""}`));
    if (warnings > 0) counts.push(pc.yellow(`${warnings} warning${warnings > 1 ? "s" : ""}`));

    lines.push(`  ${pc.bold(`[${icon}] ${label}`)}  ${counts.join(", ")}`);

    // Group by rule within category
    const byRule = new Map<string, Diagnostic[]>();
    for (const d of diags) {
      const list = byRule.get(d.rule) ?? [];
      list.push(d);
      byRule.set(d.rule, list);
    }

    for (const [rule, ruleDiags] of byRule) {
      const first = ruleDiags[0];
      const sevIcon =
        first.severity === "error" ? pc.red("\u2716") : pc.yellow("\u25B2");
      const count = ruleDiags.length > 1 ? pc.dim(` (x${ruleDiags.length})`) : "";

      lines.push(`    ${sevIcon} ${first.message}${count}`);
      lines.push(`      ${pc.dim(first.help)}`);

      if (verbose) {
        for (const d of ruleDiags) {
          lines.push(
            `      ${pc.dim("\u2502")} ${pc.cyan(d.filePath)}${pc.dim(`:${d.line}:${d.col}`)}`,
          );
        }
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function formatSummary(
  errors: number,
  warnings: number,
  fileCount: number,
): string {
  const total = errors + warnings;
  const lines = [
    pc.dim(`  Scanned ${fileCount} file${fileCount !== 1 ? "s" : ""}, found ${total} issue${total !== 1 ? "s" : ""}`),
    `  ${pc.red(`${errors} error${errors !== 1 ? "s" : ""}`)}  ${pc.yellow(`${warnings} warning${warnings !== 1 ? "s" : ""}`)}`,
    "",
  ];
  return lines.join("\n");
}

function frameLine(text: string, colorize: (s: string) => string): string {
  const width = stripAnsi(text).length + 2;
  const top = colorize("\u250C" + "\u2500".repeat(width) + "\u2510");
  const mid = colorize("\u2502") + text + colorize("\u2502");
  const bot = colorize("\u2514" + "\u2500".repeat(width) + "\u2518");
  return `${top}\n${mid}\n${bot}`;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
