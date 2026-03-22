#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const SKILL_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".claude",
  "skills",
  "vue-audit",
);

const SKILL_MD = `---
name: vue-audit
description: Run after making Vue.js/Nuxt changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in a Vue project.
version: 1.0.0
---

# Vue.js Audit

Scans your Vue.js/Nuxt codebase for security, performance, reactivity, accessibility, correctness, and architecture issues. Outputs a 0-100 health score with actionable diagnostics.

## Usage

\`\`\`bash
npx -y vuejs-audit@latest . --verbose
\`\`\`

## Workflow

Run after making changes to catch issues early. Fix errors first, then re-run to verify the score improved.
`;

const AGENTS_MD = `# Vue.js Audit

Run after making Vue.js/Nuxt changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in a Vue project.

Scans your Vue.js/Nuxt codebase for security, performance, reactivity, accessibility, correctness, and architecture issues. Outputs a 0-100 health score with actionable diagnostics.

## Usage

\`\`\`bash
npx -y vuejs-audit@latest . --verbose
\`\`\`

## Workflow

Run after making changes to catch issues early. Fix errors first, then re-run to verify the score improved.
`;

async function main() {
  // Skip in CI
  if (process.env.CI) return;

  // Skip if not interactive (piped input)
  if (!process.stdin.isTTY) {
    console.log(
      "\n  \x1b[1mvuejs-audit\x1b[0m \u2014 To add the Claude Code skill, run: \x1b[36mnpx vuejs-audit --install-skill\x1b[0m\n",
    );
    return;
  }

  // Already installed
  if (existsSync(join(SKILL_DIR, "SKILL.md"))) return;

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question(
      "\n  \x1b[1mvuejs-audit\x1b[0m \u2014 Add as a Claude Code skill? (y/N) ",
      resolve,
    );
  });

  rl.close();

  if (answer.trim().toLowerCase() !== "y") {
    return;
  }

  try {
    mkdirSync(SKILL_DIR, { recursive: true });
    writeFileSync(join(SKILL_DIR, "SKILL.md"), SKILL_MD);
    writeFileSync(join(SKILL_DIR, "AGENTS.md"), AGENTS_MD);
    console.log("  \x1b[32m\u2713\x1b[0m Skill installed! Use \x1b[1m/vue-audit\x1b[0m in Claude Code.\n");
  } catch {
    console.log("  \x1b[33m\u26A0\x1b[0m Could not install skill. You can add it manually.\n");
  }
}

main();
