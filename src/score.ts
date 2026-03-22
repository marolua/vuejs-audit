import type { Diagnostic } from "./types.js";

const PERFECT_SCORE = 100;
const ERROR_PENALTY = 5;
const WARNING_PENALTY = 1;

export function calculateScore(diagnostics: Diagnostic[]) {
  let errors = 0;
  let warnings = 0;

  for (const d of diagnostics) {
    if (d.severity === "error") errors++;
    else warnings++;
  }

  const penalty = errors * ERROR_PENALTY + warnings * WARNING_PENALTY;
  const score = Math.max(0, PERFECT_SCORE - penalty);

  return { score, label: getLabel(score), errors, warnings };
}

function getLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs work";
  return "Critical";
}
