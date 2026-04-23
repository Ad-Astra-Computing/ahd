import type { Violation, Rule, LintInput } from "./types.js";

export function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

export function findAll(source: string, pattern: RegExp): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push(m);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

export function extractInline(
  html: string,
): { style: string; script: string; text: string } {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .join("\n");
  const text = html.replace(/<[^>]+>/g, " ");
  return { style: styleBlocks, script: scriptBlocks, text };
}

export function violation(
  rule: Rule,
  input: LintInput,
  message: string,
  extra?: { line?: number; snippet?: string },
): Violation {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    file: input.file,
    message,
    line: extra?.line,
    snippet: extra?.snippet,
  };
}
