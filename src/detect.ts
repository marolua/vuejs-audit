import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ProjectInfo } from "./types.js";

export function detectProject(dir: string): ProjectInfo {
  const pkgPath = join(dir, "package.json");
  let pkg: Record<string, unknown> = {};

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    } catch {
      // ignore malformed package.json
    }
  }

  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };

  const nuxt = "nuxt" in deps;
  const vueVersion = deps["vue"] ?? null;
  const typescript =
    "typescript" in deps ||
    existsSync(join(dir, "tsconfig.json")) ||
    existsSync(join(dir, "nuxt.config.ts")) ||
    existsSync(join(dir, "vite.config.ts"));

  return {
    framework: nuxt ? "Nuxt" : "Vue",
    vueVersion,
    typescript,
    nuxt,
  };
}
