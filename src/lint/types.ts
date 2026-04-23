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

// Multi-file / cross-file rules receive every linted file at once and
// return violations that only make sense in context (broken internal
// links, missing shared layout import, duplicated unique-per-site
// elements like <meta property="og:url">). Engine runs these after all
// per-file rules in one pass.
export interface CrossFileRule {
  id: string;
  severity: Severity;
  description: string;
  check: (inputs: LintInput[]) => Violation[];
}

export interface LintReport {
  violations: Violation[];
  rulesRun: string[];
  filesLinted: number;
  overrides?: Array<{ ruleId: string; severity: "error" | "warn" | "info" | "off"; reason: string }>;
}
