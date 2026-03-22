#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const SKILL_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".claude",
  "skills",
  "svelte-audit",
);

const SKILL_MD = `---
name: svelte-audit
description: Run after making Svelte/SvelteKit changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in a Svelte project.
version: 1.0.0
---

# Svelte Audit

Scans your Svelte/SvelteKit codebase for security, performance, reactivity, accessibility, correctness, and architecture issues. Outputs a 0-100 health score with actionable diagnostics.

## Usage

\`\`\`bash
npx -y svelte-audit@latest . --verbose
\`\`\`

## Workflow

Run after making changes to catch issues early. Fix errors first, then re-run to verify the score improved.
`;

const AGENTS_MD = `# Svelte Audit

Run after making Svelte/SvelteKit changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in a Svelte project.

Scans your Svelte/SvelteKit codebase for security, performance, reactivity, accessibility, correctness, and architecture issues. Outputs a 0-100 health score with actionable diagnostics.

## Usage

\`\`\`bash
npx -y svelte-audit@latest . --verbose
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
      "\n  \x1b[1msvelte-audit\x1b[0m — To add the Claude Code skill, run: \x1b[36mnpx svelte-audit --install-skill\x1b[0m\n",
    );
    return;
  }

  // Already installed
  if (existsSync(join(SKILL_DIR, "SKILL.md"))) return;

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question(
      "\n  \x1b[1msvelte-audit\x1b[0m — Add as a Claude Code skill? (y/N) ",
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
    console.log("  \x1b[32m✓\x1b[0m Skill installed! Use \x1b[1m/svelte-audit\x1b[0m in Claude Code.\n");
  } catch {
    console.log("  \x1b[33m⚠\x1b[0m Could not install skill. You can add it manually.\n");
  }
}

main();
