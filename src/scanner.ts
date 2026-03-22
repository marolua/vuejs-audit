import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import fg from "fast-glob";
import type { Diagnostic, DiagnoseOptions, ProjectInfo } from "./types.js";
import { allRules } from "./rules/index.js";

export async function scanFiles(
  dir: string,
  project: ProjectInfo,
  options: DiagnoseOptions,
): Promise<Diagnostic[]> {
  const absDir = resolve(dir);

  const ignorePatterns = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.svelte-kit/**",
    ...(options.ignore?.files ?? []),
  ];

  const files = await fg(["**/*.svelte", "**/*.ts", "**/*.js"], {
    cwd: absDir,
    ignore: ignorePatterns,
    absolute: true,
    dot: false,
  });

  // Filter out declaration files and config files
  const sourceFiles = files.filter(
    (f) =>
      !f.endsWith(".d.ts") &&
      !f.includes("svelte.config") &&
      !f.includes("vite.config") &&
      !f.includes("eslint") &&
      !f.includes("prettier"),
  );

  const diagnostics: Diagnostic[] = [];
  const ignoredRules = new Set(options.ignore?.rules ?? []);

  for (const file of sourceFiles) {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    const relPath = relative(absDir, file);

    for (const rule of allRules) {
      const results = rule(content, file, project);
      for (const d of results) {
        if (ignoredRules.has(d.rule)) continue;

        // Check inline suppression
        const lines = content.split("\n");
        const lineIdx = d.line - 1;
        const currentLine = lines[lineIdx] ?? "";
        const prevLine = lines[lineIdx - 1] ?? "";

        if (
          currentLine.includes("svelte-audit-disable-line") ||
          prevLine.includes("svelte-audit-disable-next-line")
        ) {
          continue;
        }

        diagnostics.push({ ...d, filePath: relPath });
      }
    }
  }

  return diagnostics;
}

export function loadConfig(dir: string): DiagnoseOptions["ignore"] {
  const configPath = resolve(dir, "svelte-audit.config.json");

  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      return config.ignore;
    } catch {
      // ignore
    }
  }

  // Check package.json
  const pkgPath = resolve(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      return pkg.svelteAudit?.ignore;
    } catch {
      // ignore
    }
  }

  return undefined;
}
