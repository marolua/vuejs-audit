import { resolve } from "node:path";
import { detectProject } from "./detect.js";
import { scanFiles, loadConfig } from "./scanner.js";
import { calculateScore } from "./score.js";
import type { DiagnoseOptions, DiagnoseResult } from "./types.js";

export type { Diagnostic, DiagnoseResult, DiagnoseOptions, ProjectInfo } from "./types.js";

export async function diagnose(
  directory: string,
  options: DiagnoseOptions = {},
): Promise<DiagnoseResult> {
  const dir = resolve(directory);

  const project = detectProject(dir);
  const configIgnore = loadConfig(dir);

  const mergedOptions: DiagnoseOptions = {
    ...options,
    ignore: {
      rules: [...(configIgnore?.rules ?? []), ...(options.ignore?.rules ?? [])],
      files: [...(configIgnore?.files ?? []), ...(options.ignore?.files ?? [])],
    },
  };

  const diagnostics = await scanFiles(dir, project, mergedOptions);
  const score = calculateScore(diagnostics);

  return { score, project, diagnostics };
}
