import { readFile } from "node:fs/promises";
import { rules as defaultRules } from "./rules/index.js";
import type { LintInput, LintReport, Rule, Violation } from "./types.js";

export function lintSource(input: LintInput, rules: Rule[] = defaultRules): LintReport {
  const violations: Violation[] = [];
  for (const rule of rules) {
    try {
      violations.push(...rule.check(input));
    } catch (err) {
      violations.push({
        ruleId: rule.id,
        severity: "error",
        file: input.file,
        message: `rule threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  return {
    violations,
    rulesRun: rules.map((r) => r.id),
    filesLinted: 1,
  };
}

export async function lintFile(path: string, rules?: Rule[]): Promise<LintReport> {
  const raw = await readFile(path, "utf8");
  const isCss = /\.css$/i.test(path);
  return lintSource(
    { file: path, html: isCss ? "" : raw, css: isCss ? raw : "" },
    rules,
  );
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
