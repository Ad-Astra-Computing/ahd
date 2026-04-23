import { readFile } from "node:fs/promises";
import { rules as defaultRules } from "./rules/index.js";
import { crossFileRules as defaultCrossRules } from "./cross-rules/index.js";
import type {
  CrossFileRule,
  LintInput,
  LintReport,
  Rule,
  Violation,
} from "./types.js";
import {
  applyConfig,
  type AhdProjectConfig,
  type RuleOverride,
} from "./config.js";

export function lintSource(
  input: LintInput,
  rules: Rule[] = defaultRules,
  config?: AhdProjectConfig,
): LintReport {
  const { rules: effectiveRules, applied } = applyConfig(rules, config);
  // Each rule's check() closes over its own `rule` reference when it builds
  // violations via util.violation(), so applyConfig's severity override
  // doesn't propagate through the check itself. We post-process here.
  const severityById = new Map(effectiveRules.map((r) => [r.id, r.severity]));
  const violations: Violation[] = [];
  for (const rule of effectiveRules) {
    try {
      for (const v of rule.check(input)) {
        const overridden = severityById.get(v.ruleId);
        violations.push(overridden && overridden !== v.severity ? { ...v, severity: overridden } : v);
      }
    } catch (err) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        file: input.file,
        message: `rule threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  return {
    violations,
    rulesRun: effectiveRules.map((r) => r.id),
    filesLinted: 1,
    overrides: applied,
  };
}

export async function lintFile(
  path: string,
  rules?: Rule[],
  config?: AhdProjectConfig,
): Promise<LintReport> {
  const raw = await readFile(path, "utf8");
  const isCss = /\.css$/i.test(path);
  return lintSource(
    { file: path, html: isCss ? "" : raw, css: isCss ? raw : "" },
    rules,
    config,
  );
}

/**
 * Run per-file + cross-file rules over a set of inputs. Returns a single
 * merged report. Consumers that want to feed every file in a dist/ at once
 * (ahd-provenance scripts, `ahd lint --all`) call this. Config overrides
 * apply to both rule sets.
 */
export function lintSources(
  inputs: LintInput[],
  rules: Rule[] = defaultRules,
  crossRules: CrossFileRule[] = defaultCrossRules,
  config?: AhdProjectConfig,
): LintReport {
  const perFileReports = inputs.map((i) => lintSource(i, rules, config));
  const violations: Violation[] = perFileReports.flatMap((r) => r.violations);
  const rulesRun = new Set<string>(perFileReports.flatMap((r) => r.rulesRun));

  // Cross-file rules: apply config overrides the same way per-file rules do.
  const overrideById = new Map(
    (config?.overrides ?? []).map((o) => [o.ruleId, o]),
  );
  for (const rule of crossRules) {
    const override = overrideById.get(rule.id);
    if (override?.severity === "off") continue;
    rulesRun.add(rule.id);
    try {
      // After the `continue` above, override (if defined) is guaranteed
      // to carry a non-"off" severity.
      const overrideSev: Violation["severity"] | undefined = override
        ? (override.severity as Violation["severity"])
        : undefined;
      for (const v of rule.check(inputs)) {
        const effSev = overrideSev ?? v.severity;
        violations.push(effSev !== v.severity ? { ...v, severity: effSev } : v);
      }
    } catch (err) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        file: inputs[0]?.file ?? "",
        message: `cross-file rule threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return {
    violations,
    rulesRun: [...rulesRun],
    filesLinted: inputs.length,
    overrides: perFileReports[0]?.overrides ?? [],
  };
}

export function formatReport(report: LintReport): string {
  if (report.violations.length === 0) {
    return `clean · ${report.filesLinted} file(s) · ${report.rulesRun.length} rules`;
  }
  const bySev = { error: 0, warn: 0, info: 0 };
  const lines: string[] = [];
  for (const v of report.violations) {
    bySev[v.severity]++;
    const loc = v.line ? `:${v.line}` : "";
    lines.push(
      `${v.severity.padEnd(5)} ${v.ruleId.padEnd(36)} ${v.file}${loc}\n    ${v.message}` +
        (v.snippet ? `\n    → ${v.snippet}` : ""),
    );
  }
  lines.push(
    `\n${bySev.error} error · ${bySev.warn} warn · ${bySev.info} info · ${report.filesLinted} file(s) · ${report.rulesRun.length} rules`,
  );
  return lines.join("\n");
}
