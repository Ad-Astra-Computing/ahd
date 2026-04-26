export type Severity = "error" | "warn" | "info";

// Lifecycle status for every rule. Drives recommended-config inclusion,
// release-notes auto-generation, and the optional `experimental` opt-in
// flag downstream consumers may want to honour.
//
// - experimental: brand-new rule, may have unknown false-positive rate.
//   Excluded from the recommended config in plugins. Consumers must
//   opt in explicitly. Promote to stable after sustained low-FP
//   measurement against a held-out fixture corpus.
// - stable: shipped at its declared severity. Included in recommended
//   config. The default state for all rules that are not deliberately
//   in transition.
// - deprecated: scheduled for removal. Still fires (so existing
//   downstream configs don't break silently) but emits a deprecation
//   notice. `deprecatedAt` records the version that flagged it;
//   `deprecationReason` names the cause (superseded by X, replaced by
//   vision rule Y, etc.).
export type RuleStatus = "experimental" | "stable" | "deprecated";

// Optional today; the build-rules-manifest script defaults missing
// status to "stable" and missing introducedAt to "<= 0.8.x" so the
// existing rule corpus does not need a one-shot annotation pass.
// New rules SHOULD declare both fields explicitly. The lint
// presented in CONTRIBUTING.md assert on annotation-completeness
// over time as rules graduate to the new contract.
export interface RuleMetadata {
  status?: RuleStatus;
  introducedAt?: string;
  deprecatedAt?: string;
  deprecationReason?: string;
}

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

export interface Rule extends RuleMetadata {
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
export interface CrossFileRule extends RuleMetadata {
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
