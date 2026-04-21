export type Severity = "error" | "warn" | "info";

export interface LintInput {
  file: string;
  html: string;
  css: string;
}

export interface Violation {
  ruleId: string;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
  snippet?: string;
}

export interface Rule {
  id: string;
  severity: Severity;
  description: string;
  check: (input: LintInput) => Violation[];
}

export interface LintReport {
  violations: Violation[];
  rulesRun: string[];
  filesLinted: number;
}
