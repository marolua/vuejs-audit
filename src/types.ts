export interface Diagnostic {
  filePath: string;
  rule: string;
  category: Category;
  severity: "error" | "warning";
  message: string;
  help: string;
  line: number;
  col: number;
}

export type Category =
  | "reactivity"
  | "correctness"
  | "security"
  | "performance"
  | "accessibility"
  | "architecture"
  | "nuxt";

export interface ProjectInfo {
  framework: "Nuxt" | "Vue";
  vueVersion: string | null;
  typescript: boolean;
  nuxt: boolean;
}

export interface DiagnoseResult {
  score: { score: number; label: string; errors: number; warnings: number };
  project: ProjectInfo;
  diagnostics: Diagnostic[];
}

export interface DiagnoseOptions {
  verbose?: boolean;
  score?: boolean;
  ignore?: { rules?: string[]; files?: string[] };
}

export type RuleFn = (
  content: string,
  filePath: string,
  project: ProjectInfo,
) => Diagnostic[];
