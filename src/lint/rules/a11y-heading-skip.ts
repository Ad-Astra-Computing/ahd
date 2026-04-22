import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

// Heading hierarchy that skips levels (h1 → h3, h2 → h4). Screen-
// reader users navigate by heading level; skipping breaks the
// outline. AI generators do this when they use headings as style
// rather than as structure ("this section looks big, use h3 for
// the label").
export const rule: Rule = {
  id: "ahd/a11y/heading-skip",
  severity: "warn",
  description:
    "Heading hierarchy skips a level (e.g. h1 followed by h3 with no h2). Screen-reader users rely on outline depth; don't skip.",
  check: (input) => {
    const out: ReturnType<Rule["check"]> = [];
    const pattern = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
    let prevLevel: number | null = null;
    for (const m of findAll(input.html, pattern)) {
      const level = parseInt(m[1], 10);
      if (prevLevel !== null && level > prevLevel + 1) {
        out.push(
          violation(
            rule,
            input,
            `<h${level}> follows <h${prevLevel}> without an intermediate <h${prevLevel + 1}>. Either demote this heading or add a parent heading.`,
            {
              line: lineOf(input.html, m.index),
              snippet: m[0].slice(0, 140),
            },
          ),
        );
      }
      prevLevel = level;
    }
    return out;
  },
};
