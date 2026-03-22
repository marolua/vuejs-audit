#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { diagnose } from "./index.js";
import { formatScore, formatDiagnostics, formatSummary } from "./format.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));

let version = "1.0.0";
try {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8"));
  version = pkg.version;
} catch {
  // use default
}

const SKILL_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".claude", "skills", "vue-audit",
);

const SKILL_CONTENT = [
  "---",
  "name: vue-audit",
  "description: Run after making Vue.js/Nuxt changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in a Vue project.",
  "version: 1.0.0",
  "---",
  "",
  "# Vue.js Audit",
  "",
  "Scans your Vue.js/Nuxt codebase for security, performance, reactivity, accessibility, correctness, and architecture issues. Outputs a 0-100 health score with actionable diagnostics.",
  "",
  "## Usage",
  "",
  "```bash",
  "npx -y vuejs-audit@latest . --verbose",
  "```",
  "",
  "## Workflow",
  "",
  "Run after making changes to catch issues early. Fix errors first, then re-run to verify the score improved.",
  "",
].join("\n");

function installSkill(): void {
  mkdirSync(SKILL_DIR, { recursive: true });
  writeFileSync(join(SKILL_DIR, "SKILL.md"), SKILL_CONTENT);
  console.log(pc.green("  \u2713") + " Skill installed! Use " + pc.bold("/vue-audit") + " in Claude Code.\n");
}

async function promptSkillInstall(): Promise<void> {
  // Skip if already installed, CI, or non-interactive
  if (existsSync(join(SKILL_DIR, "SKILL.md"))) return;
  if (process.env.CI) return;
  if (!process.stdin.isTTY) return;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(
      pc.bold("  Claude Code") + pc.dim(" \u2014 Add ") + pc.bold("/vue-audit") + pc.dim(" skill? (Y/n) "),
      resolve,
    );
  });
  rl.close();

  const a = answer.trim().toLowerCase();
  if (a === "" || a === "y" || a === "yes") {
    installSkill();
  }
}

const program = new Command();

program
  .name("vuejs-audit")
  .description("Diagnose and fix issues in your Vue.js/Nuxt codebase")
  .version(version)
  .argument("[directory]", "Project directory to scan", ".")
  .option("--verbose", "Show file paths and line numbers for each issue")
  .option("--score", "Output only the health score")
  .option("--fail-on <level>", "Exit with code 1 on 'error', 'warning', or 'none'", "none")
  .action(async (directory: string, opts: { verbose?: boolean; score?: boolean; failOn?: string }) => {
    const dir = resolve(directory);

    console.log("");
    console.log(
      pc.bold("  vuejs-audit") + pc.dim(` v${version}`),
    );
    console.log(pc.dim(`  Scanning ${dir} ...\n`));

    const startTime = Date.now();

    try {
      const result = await diagnose(dir, { verbose: opts.verbose });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (opts.score) {
        // Score-only mode for CI
        console.log(result.score.score);
        process.exit(0);
      }

      // Project info
      console.log(
        pc.dim("  Project: ") +
          pc.bold(result.project.framework) +
          (result.project.vueVersion
            ? pc.dim(` (vue ${result.project.vueVersion})`)
            : "") +
          (result.project.typescript ? pc.dim(" + TypeScript") : ""),
      );

      // Score
      console.log(formatScore(result.score.score, result.score.label));

      // Diagnostics
      console.log(formatDiagnostics(result.diagnostics, !!opts.verbose));

      // Summary
      const fileCount = new Set(result.diagnostics.map((d) => d.filePath)).size;
      if (result.diagnostics.length > 0) {
        console.log(formatSummary(result.score.errors, result.score.warnings, fileCount));
      }

      console.log(pc.dim(`  Done in ${elapsed}s\n`));

      // Prompt to install Claude Code skill
      await promptSkillInstall();

      // Exit code based on --fail-on
      if (opts.failOn === "error" && result.score.errors > 0) {
        process.exit(1);
      }
      if (opts.failOn === "warning" && (result.score.errors > 0 || result.score.warnings > 0)) {
        process.exit(1);
      }
    } catch (err) {
      console.error(pc.red(`\n  Error: ${err instanceof Error ? err.message : err}\n`));
      process.exit(1);
    }
  });

program.parse();
