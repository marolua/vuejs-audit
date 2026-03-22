import type { RuleFn } from "../types.js";
import { reactivityRules } from "./reactivity.js";
import { correctnessRules } from "./correctness.js";
import { securityRules } from "./security.js";
import { performanceRules } from "./performance.js";
import { accessibilityRules } from "./accessibility.js";
import { architectureRules } from "./architecture.js";
import { nuxtRules } from "./nuxt.js";

export const allRules: RuleFn[] = [
  ...reactivityRules,
  ...correctnessRules,
  ...securityRules,
  ...performanceRules,
  ...accessibilityRules,
  ...architectureRules,
  ...nuxtRules,
];
